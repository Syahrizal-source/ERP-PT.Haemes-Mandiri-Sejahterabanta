import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import type {
  PiutangProyekAccounting,
  StatusPiutangProyek,
} from "@/types/proyek";

import {
  piutangProyekSchema,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

import { postPiutangProyek } from "@/lib/accounting/postPiutangProyek";

// =====================================================
// STATUS PIUTANG
// =====================================================

function isValidStatus(value: string | null): value is StatusPiutangProyek {
  return (
    value === "Unpaid (Menunggu Pembayaran)" ||
    value === "Partial (Pembayaran Sebagian)" ||
    value === "Paid (Pembayaran Penuh/ Lunas)"
  );
}

// =====================================================
// GET PIUTANG PROYEK
// =====================================================

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");
    const customer = searchParams.get("customer");
    const statusParam = searchParams.get("status");

    const status = isValidStatus(statusParam) ? statusParam : null;

    let query = db.from("v_piutang_proyek").select("*").order("tanggal", {
      ascending: false,
    });

    if (idProyek && idProyek.trim() !== "") {
      query = query.eq("id_proyek", idProyek);
    }

    if (customer && customer.trim() !== "") {
      query = query.ilike("customer", `%${customer.trim()}%`);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal mengambil piutang proyek: ${error.message}`);
    }

    const result: PiutangProyekAccounting[] = (data ??
      []) as PiutangProyekAccounting[];

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PIUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data piutang proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

// =====================================================
// POST PIUTANG PROYEK
//
// Penting:
// POST ini TIDAK membuat jurnal pendapatan baru.
//
// Jurnal piutang sudah dibuat ketika proyek_tagihan
// diposting.
//
// piutang_proyek.id_jurnal = proyek_tagihan.id_jurnal
// =====================================================

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // =================================================
    // VALIDASI REQUEST
    // =================================================

    const body: unknown = await req.json();

    const parsed = piutangProyekSchema.parse(body);

    validatePiutangProyek(parsed);

    const nilaiPiutang = Number(parsed.nilai_piutang);
    const penerimaan = Number(parsed.penerimaan);

    if (!Number.isFinite(nilaiPiutang) || nilaiPiutang <= 0) {
      throw new Error("Nilai piutang harus lebih besar dari 0.");
    }

    if (!Number.isFinite(penerimaan) || penerimaan < 0) {
      throw new Error("Penerimaan piutang tidak valid.");
    }

    if (penerimaan > nilaiPiutang) {
      throw new Error("Penerimaan tidak boleh melebihi nilai piutang.");
    }

    const saldo = nilaiPiutang - penerimaan;

    if (!Number.isFinite(saldo) || saldo < 0) {
      throw new Error("Saldo piutang tidak boleh minus.");
    }

    // =================================================
    // AMBIL TAGIHAN
    // =================================================

    const { data: tagihan, error: tagihanError } = await db
      .from("proyek_tagihan")
      .select(
        `
          id,
          id_proyek,
          nomor_invoice,
          tanggal,
          grand_total,
          id_jurnal
        `,
      )
      .eq("id", parsed.id_tagihan)
      .single();

    if (tagihanError || !tagihan) {
      throw new Error("Tagihan proyek tidak ditemukan.");
    }

    // =================================================
    // VALIDASI PROYEK
    // =================================================

    if (tagihan.id_proyek !== parsed.id_proyek) {
      throw new Error("Tagihan tidak sesuai dengan proyek.");
    }

    // =================================================
    // TAGIHAN HARUS MEMILIKI JURNAL
    // =================================================

    if (tagihan.id_jurnal === null) {
      throw new Error("Tagihan belum memiliki jurnal Posted.");
    }

    const idJurnalTagihan = Number(tagihan.id_jurnal);

    if (!Number.isSafeInteger(idJurnalTagihan)) {
      throw new Error("ID jurnal tagihan tidak valid.");
    }

    // =================================================
    // PASTIKAN JURNAL MEMANG ADA
    // =================================================

    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .select(
        `
          id_jurnal,
          tanggal,
          no_bukti,
          sumber,
          id_periode
        `,
      )
      .eq("id_jurnal", idJurnalTagihan)
      .single();

    if (jurnalError || !jurnal) {
      throw new Error(
        `Jurnal #${idJurnalTagihan} untuk tagihan tidak ditemukan.`,
      );
    }

    // =================================================
    // VALIDASI GRAND TOTAL
    // =================================================

    const grandTotal = Number(tagihan.grand_total);

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      throw new Error("Grand total tagihan tidak valid.");
    }

    if (nilaiPiutang !== grandTotal) {
      throw new Error(
        `Nilai piutang harus sama dengan grand total tagihan. ` +
          `Piutang: ${nilaiPiutang}, ` +
          `Grand Total: ${grandTotal}.`,
      );
    }

    // =================================================
    // CEGAH DUPLIKAT
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("piutang_proyek")
      .select("id_piutang_proyek")
      .eq("id_tagihan", parsed.id_tagihan)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Gagal memeriksa piutang existing: ${existingError.message}`,
      );
    }

    if (existing) {
      throw new Error("Piutang untuk tagihan tersebut sudah dibuat.");
    }

    // =================================================
    // SIMPAN PIUTANG
    //
    // postPiutangProyek:
    // - tidak membuat jurnal baru
    // - menggunakan jurnal tagihan
    // - insert piutang_proyek
    // =================================================

    const result = await postPiutangProyek(parsed);

    // =================================================
    // AMBIL DATA HASIL
    // =================================================

    const { data: piutang, error: piutangError } = await db
      .from("piutang_proyek")
      .select(
        `
          id_piutang_proyek,
          id_proyek,
          id_tagihan,
          tanggal,
          customer,
          tanggal_pembayaran,
          nilai_piutang,
          penerimaan,
          saldo,
          keterangan,
          status,
          is_posted,
          id_jurnal,
          created_at,
          updated_at
        `,
      )
      .eq("id_piutang_proyek", result.id_piutang_proyek)
      .single();

    if (piutangError || !piutang) {
      throw new Error(
        "Piutang berhasil dibuat tetapi data hasil tidak dapat diambil.",
      );
    }

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      {
        message: "Piutang proyek berhasil disimpan tanpa membuat jurnal baru.",
        data: piutang,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PIUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan piutang proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
