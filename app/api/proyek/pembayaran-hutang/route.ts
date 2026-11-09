import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import { proyekPembayaranHutangSchema } from "@/lib/validators/proyekPembayaranHutang";
import { postProyekPembayaranHutang } from "@/lib/accounting/postProyekPembayaranHutang";

type PembayaranHutangRow = {
  id: string;
  id_hutang: string;
  tanggal: string;
  jumlah: number | string;
  metode: string | null;
  bank: string | null;
  created_at?: string;
};

type HutangRow = {
  id: string;
  id_proyek: string;
  supplier: string | null;
  nilai: number | string;
  jumlah_pembayaran: number | string;
  sisa: number | string;
  status: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

/* ============================================================
   GET PEMBAYARAN HUTANG PROYEK
   ============================================================ */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    if (!idProyek) {
      return NextResponse.json(
        {
          success: false,
          error: "id_proyek wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("proyek_pembayaran_hutang")
      .select(
        `
        id,
        id_hutang,
        tanggal,
        jumlah,
        metode,
        bank,
        created_at,
        proyek_hutang!inner (
          id_proyek,
          supplier,
          no_bukti
        )
        `,
      )
      .eq("proyek_hutang.id_proyek", idProyek)
      .order("tanggal", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN HUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   POST PEMBAYARAN HUTANG PROYEK
   ============================================================ */

export async function POST(req: NextRequest) {
  try {
    const payload = proyekPembayaranHutangSchema.parse(await req.json());

    const jumlah = Number(payload.jumlah);

    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      throw new Error("Jumlah pembayaran harus lebih besar dari 0.");
    }

    /* ========================================================
       AMBIL HUTANG
       ======================================================== */

    const { data: hutang, error: hutangError } = await db
      .from("proyek_hutang")
      .select(
        `
        id,
        id_proyek,
        supplier,
        nilai,
        jumlah_pembayaran,
        sisa,
        status
        `,
      )
      .eq("id", payload.id_hutang)
      .single();

    if (hutangError || !hutang) {
      throw new Error("Hutang proyek tidak ditemukan.");
    }

    const hutangData = hutang as HutangRow;

    /* ========================================================
       VALIDASI SALDO HUTANG
       ======================================================== */

    const nilaiHutang = Number(hutangData.nilai);
    const jumlahPembayaranSebelumnya = Number(
      hutangData.jumlah_pembayaran ?? 0,
    );

    const sisaDatabase = Number(hutangData.sisa ?? 0);

    if (!Number.isFinite(nilaiHutang) || nilaiHutang < 0) {
      throw new Error("Nilai hutang tidak valid.");
    }

    if (
      !Number.isFinite(jumlahPembayaranSebelumnya) ||
      jumlahPembayaranSebelumnya < 0
    ) {
      throw new Error("Total pembayaran hutang tidak valid.");
    }

    if (!Number.isFinite(sisaDatabase) || sisaDatabase < 0) {
      throw new Error("Sisa hutang tidak valid.");
    }

    if (sisaDatabase <= 0) {
      throw new Error("Hutang proyek sudah lunas.");
    }

    /* ========================================================
       ANTI OVER PAYMENT
       ======================================================== */

    if (jumlah > sisaDatabase) {
      throw new Error(
        `Pembayaran Rp${jumlah.toLocaleString(
          "id-ID",
        )} melebihi sisa hutang Rp${sisaDatabase.toLocaleString("id-ID")}.`,
      );
    }

    /* ========================================================
       VALIDASI BANK
       ======================================================== */

    if (payload.metode === "BANK" && !payload.bank?.trim()) {
      throw new Error("Bank wajib diisi untuk pembayaran melalui BANK.");
    }

    /* ========================================================
       INSERT PEMBAYARAN
       ======================================================== */

    const { data: pembayaran, error: pembayaranError } = await db
      .from("proyek_pembayaran_hutang")
      .insert({
        id_hutang: payload.id_hutang,
        tanggal: payload.tanggal,
        jumlah,
        metode: payload.metode,
        bank: payload.bank?.trim() || null,
      })
      .select(
        `
        id,
        id_hutang,
        tanggal,
        jumlah,
        metode,
        bank,
        created_at
        `,
      )
      .single();

    if (pembayaranError || !pembayaran) {
      throw new Error(
        pembayaranError?.message ?? "Gagal menyimpan pembayaran hutang.",
      );
    }

    const pembayaranData = pembayaran as PembayaranHutangRow;

    /* ========================================================
       NOMOR BUKTI PEMBAYARAN
       ======================================================== */

    const noBukti = `BHT-${pembayaranData.id.substring(0, 8).toUpperCase()}`;

    /* ========================================================
       POSTING ACCOUNTING
       
       Jurnal:
       
       Dr 21010 Hutang Proyek
       Cr COA KAS/BANK sesuai coa_mapping PROYEK
       ======================================================== */

    let idJurnal: number;

    try {
      idJurnal = await postProyekPembayaranHutang({
        id_pembayaran: pembayaranData.id,
        id_hutang: payload.id_hutang,
        tanggal: payload.tanggal,
        jumlah,
        metode: payload.metode,
        bank: payload.bank?.trim() || null,
        no_bukti: noBukti,
      });
    } catch (error: unknown) {
      console.error("POSTING PEMBAYARAN HUTANG ERROR:", error);

      /*
       * Pembayaran belum boleh tertinggal jika posting jurnal gagal.
       */
      await db
        .from("proyek_pembayaran_hutang")
        .delete()
        .eq("id", pembayaranData.id);

      throw new Error(
        `Pembayaran tidak dapat diposting: ${getErrorMessage(error)}`,
      );
    }

    /* ========================================================
       HITUNG TOTAL PEMBAYARAN TERBARU
       ======================================================== */

    const { data: seluruhPembayaran, error: listError } = await db
      .from("proyek_pembayaran_hutang")
      .select("jumlah")
      .eq("id_hutang", payload.id_hutang);

    if (listError) {
      throw new Error(
        `Gagal menghitung total pembayaran: ${listError.message}`,
      );
    }

    const totalPembayaran =
      seluruhPembayaran?.reduce(
        (total: number, item: { jumlah: number | string }) =>
          total + Number(item.jumlah),
        0,
      ) ?? 0;

    const sisa = Math.max(nilaiHutang - totalPembayaran, 0);

    /* ========================================================
       STATUS HUTANG
       ======================================================== */

    let status:
      | "Unpaid (Menunggu Pembayaran)"
      | "Partial (Pembayaran Sebagian)"
      | "Paid (Pembayaran Penuh/ Lunas)";

    if (sisa === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (totalPembayaran > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    /* ========================================================
       UPDATE HUTANG
       ======================================================== */

    const { error: updateError } = await db
      .from("proyek_hutang")
      .update({
        jumlah_pembayaran: totalPembayaran,
        sisa,
        status,
        tanggal_pembayaran: payload.tanggal,
      })
      .eq("id", payload.id_hutang);

    if (updateError) {
      throw new Error(
        `Jurnal berhasil dibuat tetapi saldo hutang gagal diperbarui: ${updateError.message}`,
      );
    }

    /* ========================================================
       AUDIT LOG
       ======================================================== */

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_pembayaran_hutang",
      aksi: "INSERT",
      id_referensi: pembayaranData.id,
      data: {
        id_pembayaran: pembayaranData.id,
        id_hutang: payload.id_hutang,
        id_proyek: hutangData.id_proyek,
        supplier: hutangData.supplier,
        tanggal: payload.tanggal,
        jumlah,
        metode: payload.metode,
        bank: payload.bank?.trim() || null,
        no_bukti: noBukti,
        id_jurnal: idJurnal,
        nilai_hutang: nilaiHutang,
        jumlah_pembayaran: totalPembayaran,
        sisa,
        status,
      },
    });

    if (auditError) {
      console.error("AUDIT PEMBAYARAN HUTANG ERROR:", auditError);
    }

    /* ========================================================
       RESPONSE
       ======================================================== */

    return NextResponse.json(
      {
        success: true,
        message: "Pembayaran hutang proyek berhasil disimpan dan diposting.",
        data: {
          id: pembayaranData.id,
          id_hutang: payload.id_hutang,
          id_proyek: hutangData.id_proyek,
          supplier: hutangData.supplier,
          tanggal: payload.tanggal,
          jumlah,
          metode: payload.metode,
          bank: payload.bank?.trim() || null,
          no_bukti: noBukti,
          id_jurnal: idJurnal,
          nilai_hutang: nilaiHutang,
          jumlah_pembayaran: totalPembayaran,
          sisa,
          status,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN HUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
