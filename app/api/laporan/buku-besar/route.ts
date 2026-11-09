import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type CoaTipe = "ASET" | "LIABILITAS" | "EKUITAS" | "PENDAPATAN" | "BEBAN";

type Coa = {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: CoaTipe;
};

type JurnalJoin = {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
  is_posted: boolean;
};

type DetailRow = {
  debit: number;
  kredit: number;
  jurnal: JurnalJoin;
};

type BukuBesarRow = {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCoa(value: unknown): Coa | null {
  if (!isRecord(value)) {
    return null;
  }

  const tipe = value.tipe;

  const tipeValid =
    tipe === "ASET" ||
    tipe === "LIABILITAS" ||
    tipe === "EKUITAS" ||
    tipe === "PENDAPATAN" ||
    tipe === "BEBAN";

  if (
    typeof value.id_coa !== "number" ||
    !Number.isInteger(value.id_coa) ||
    typeof value.kode !== "string" ||
    typeof value.nama !== "string" ||
    !tipeValid
  ) {
    return null;
  }

  return {
    id_coa: value.id_coa,
    kode: value.kode,
    nama: value.nama,
    tipe,
  };
}

function parseJurnal(value: unknown): JurnalJoin | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.tanggal !== "string" ||
    typeof value.no_bukti !== "string" ||
    typeof value.keterangan !== "string" ||
    typeof value.id_periode !== "number" ||
    typeof value.is_posted !== "boolean"
  ) {
    return null;
  }

  return {
    tanggal: value.tanggal,
    no_bukti: value.no_bukti,
    keterangan: value.keterangan,
    id_periode: value.id_periode,
    is_posted: value.is_posted,
  };
}

function parseDetailRow(value: unknown): DetailRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const debit = Number(value.debit);
  const kredit = Number(value.kredit);

  if (!Number.isFinite(debit) || !Number.isFinite(kredit)) {
    return null;
  }

  // Supabase dapat mengembalikan relasi sebagai objek
  // atau array, tergantung bentuk relasi yang terbaca.
  const jurnalValue = Array.isArray(value.jurnal)
    ? value.jurnal[0]
    : value.jurnal;

  const jurnal = parseJurnal(jurnalValue);

  if (!jurnal) {
    return null;
  }

  return {
    debit,
    kredit,
    jurnal,
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const idPeriodeParam = searchParams.get("id_periode");
    const idCoaParam = searchParams.get("id_coa");

    if (!idPeriodeParam || !idCoaParam) {
      return NextResponse.json(
        { error: "Parameter id_periode dan id_coa wajib diisi" },
        { status: 400 },
      );
    }

    const idPeriode = Number(idPeriodeParam);
    const idCoa = Number(idCoaParam);

    if (
      !Number.isSafeInteger(idPeriode) ||
      idPeriode <= 0 ||
      !Number.isSafeInteger(idCoa) ||
      idCoa <= 0
    ) {
      return NextResponse.json(
        { error: "Parameter id_periode atau id_coa tidak valid" },
        { status: 400 },
      );
    }

    // =========================================
    // VALIDASI COA
    // =========================================
    const { data: coaData, error: coaError } = await db
      .from("coa")
      .select("id_coa, kode, nama, tipe")
      .eq("id_coa", idCoa)
      .single();

    if (coaError || !coaData) {
      return NextResponse.json(
        { error: "COA tidak ditemukan" },
        { status: 404 },
      );
    }

    const coa = parseCoa(coaData);

    if (!coa) {
      return NextResponse.json(
        { error: "Data COA memiliki format yang tidak valid" },
        { status: 500 },
      );
    }

    // =========================================
    // AMBIL DETAIL JURNAL POSTED
    // =========================================
    const { data, error } = await db
      .from("jurnal_detail")
      .select(
        `
        debit,
        kredit,
        jurnal: id_jurnal (
          tanggal,
          no_bukti,
          keterangan,
          id_periode,
          is_posted
        )
      `,
      )
      .eq("id_coa", idCoa)
      .eq("jurnal.id_periode", idPeriode)
      .eq("jurnal.is_posted", true)
      .order("tanggal", {
        foreignTable: "jurnal",
        ascending: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // =========================================
    // VALIDASI DAN NORMALISASI HASIL QUERY
    // =========================================
    const rowsRaw: unknown[] = Array.isArray(data) ? data : [];

    const rowsParsed: DetailRow[] = [];

    for (const item of rowsRaw) {
      const parsed = parseDetailRow(item);

      if (!parsed) {
        return NextResponse.json(
          {
            error: "Terdapat detail jurnal atau relasi jurnal yang tidak valid",
          },
          { status: 500 },
        );
      }

      // Pastikan hanya jurnal posted pada periode yang diminta.
      if (parsed.jurnal.is_posted && parsed.jurnal.id_periode === idPeriode) {
        rowsParsed.push(parsed);
      }
    }

    // =========================================
    // HITUNG SALDO BERJALAN
    // =========================================
    let saldoBerjalan = 0;

    const rows: BukuBesarRow[] = rowsParsed.map((item) => {
      const debit = item.debit;
      const kredit = item.kredit;

      if (coa.tipe === "ASET" || coa.tipe === "BEBAN") {
        saldoBerjalan += debit - kredit;
      } else {
        saldoBerjalan += kredit - debit;
      }

      return {
        tanggal: item.jurnal.tanggal,
        no_bukti: item.jurnal.no_bukti,
        keterangan: item.jurnal.keterangan,
        debit,
        kredit,
        saldo: saldoBerjalan,
      };
    });

    // =========================================
    // TOTAL DAN VALIDASI
    // =========================================
    const totalDebit = rows.reduce((total, item) => total + item.debit, 0);

    const totalKredit = rows.reduce((total, item) => total + item.kredit, 0);

    return NextResponse.json({
      coa,
      id_periode: idPeriode,
      total_transaksi: rows.length,
      total_debit: totalDebit,
      total_kredit: totalKredit,
      is_balance: Math.abs(totalDebit - totalKredit) < 0.000001,
      rows,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan internal saat mengambil buku besar";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
