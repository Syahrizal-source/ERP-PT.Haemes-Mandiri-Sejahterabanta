import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

/* =========================
   TYPE SAFE
========================= */
type TransaksiBisnisRow = {
  id: number;
  jenis_transaksi: string;
  nilai_transaksi: number;
  tanggal_transaksi: string;
};

type JurnalEntry = {
  akun: string;
  debit: number;
  kredit: number;
};

/* =========================
   MAP JURNAL (CLEAN)
========================= */
function mapJurnal(trx: TransaksiBisnisRow): {
  debit: JurnalEntry;
  kredit: JurnalEntry;
} {
  switch (trx.jenis_transaksi) {
    case "PENJUALAN":
      return {
        debit: { akun: "Piutang Usaha", debit: trx.nilai_transaksi, kredit: 0 },
        kredit: { akun: "Pendapatan", debit: 0, kredit: trx.nilai_transaksi },
      };

    case "PEMBELIAN":
      return {
        debit: {
          akun: "Beban Operasional",
          debit: trx.nilai_transaksi,
          kredit: 0,
        },
        kredit: { akun: "Kas", debit: 0, kredit: trx.nilai_transaksi },
      };

    case "GAJI":
      return {
        debit: { akun: "Beban Gaji", debit: trx.nilai_transaksi, kredit: 0 },
        kredit: { akun: "Kas", debit: 0, kredit: trx.nilai_transaksi },
      };

    case "JASA":
      return {
        debit: { akun: "Beban Jasa", debit: trx.nilai_transaksi, kredit: 0 },
        kredit: { akun: "Kas", debit: 0, kredit: trx.nilai_transaksi },
      };

    default:
      return {
        debit: {
          akun: "Beban Lainnya",
          debit: trx.nilai_transaksi,
          kredit: 0,
        },
        kredit: { akun: "Kas", debit: 0, kredit: trx.nilai_transaksi },
      };
  }
}

/* =========================
   POST /api/jurnal/auto-posting
========================= */
export async function POST() {
  // 1️⃣ Ambil transaksi yang BELUM diposting
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT id, jenis_transaksi, nilai_transaksi, tanggal_transaksi
    FROM transaksi_bisnis
    WHERE id NOT IN (
      SELECT sumber_transaksi_id FROM jurnal_umum
    )
    `
  );

  const transaksiList = rows as TransaksiBisnisRow[];

  if (transaksiList.length === 0) {
    return NextResponse.json({ message: "Tidak ada transaksi baru" });
  }

  // 2️⃣ Loop & posting jurnal
  for (const trx of transaksiList) {
    const jurnal = mapJurnal(trx);

    const entries = [
      {
        akun: jurnal.debit.akun,
        debit: jurnal.debit.debit,
        kredit: jurnal.debit.kredit,
      },
      {
        akun: jurnal.kredit.akun,
        debit: jurnal.kredit.debit,
        kredit: jurnal.kredit.kredit,
      },
    ];

    for (const entry of entries) {
      await db.query<ResultSetHeader>(
        `
        INSERT INTO jurnal_umum
          (tanggal, keterangan, sumber_transaksi_id, akun, debit, kredit)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          trx.tanggal_transaksi,
          `Auto posting transaksi ${trx.id}`,
          trx.id,
          entry.akun,
          entry.debit,
          entry.kredit,
        ]
      );
    }
  }

  return NextResponse.json({
    success: true,
    posted: transaksiList.length,
  });
}
