import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { kasbonDireksiSchema } from "@/lib/validators/kasbon";
import { postKasbonDireksi } from "@/lib/accounting/postKasbonDireksi";

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_direksi")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   POST + JURNAL
========================= */

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body request tidak valid" },
      { status: 400 },
    );
  }

  const parsed = kasbonDireksiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Data kasbon direksi tidak valid",
        details: parsed.error.format(),
      },
      { status: 400 },
    );
  }

  const { tanggal, deskripsi, no_voucher, debit, kredit, id_coa_kas } =
    parsed.data;

  /* =========================
     VALIDASI NOMINAL
  ========================= */

  if (!Number.isFinite(debit) || debit <= 0) {
    return NextResponse.json(
      { error: "Nominal kasbon direksi tidak valid" },
      { status: 400 },
    );
  }

  /*
   * Untuk transaksi Kasbon Direksi:
   *
   * DEBIT  : Piutang Direksi
   *          KASBON_DIREKSI / PIUTANG
   *          → 12005 Piutang Direksi
   *          → id_coa 2517
   *
   * KREDIT : Kas/Bank yang dipilih pada transaksi
   *
   * Kredit tidak boleh mengambil COA KASBON_DIREKSI / KAS
   * secara otomatis karena perusahaan memiliki beberapa
   * akun kas dan bank.
   */

  if (!Number.isInteger(id_coa_kas) || id_coa_kas <= 0) {
    return NextResponse.json(
      { error: "COA kas/bank belum dipilih atau tidak valid" },
      { status: 400 },
    );
  }

  /* =========================
     VALIDASI COA KAS/BANK
  ========================= */

  const { data: coaKas, error: coaKasError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .eq("id_coa", id_coa_kas)
    .maybeSingle();

  if (coaKasError) {
    return NextResponse.json(
      {
        error: `Gagal memvalidasi COA kas/bank: ${coaKasError.message}`,
      },
      { status: 500 },
    );
  }

  if (!coaKas) {
    return NextResponse.json(
      {
        error: `COA kas/bank tidak ditemukan (id_coa=${id_coa_kas})`,
      },
      { status: 400 },
    );
  }

  if (!coaKas.aktif) {
    return NextResponse.json(
      {
        error: `COA kas/bank tidak aktif: ${coaKas.kode} - ${coaKas.nama}`,
      },
      { status: 400 },
    );
  }

  if (!coaKas.is_cash) {
    return NextResponse.json(
      {
        error: `COA bukan akun kas/bank: ${coaKas.kode} - ${coaKas.nama}`,
      },
      { status: 400 },
    );
  }

  if (coaKas.is_header) {
    return NextResponse.json(
      {
        error: `COA kas/bank tidak boleh berupa header: ${coaKas.kode} - ${coaKas.nama}`,
      },
      { status: 400 },
    );
  }

  /* =========================
     VALIDASI KREDIT
  ========================= */

  if (kredit !== 0) {
    return NextResponse.json(
      {
        error:
          "Field kredit untuk Kasbon Direksi harus 0. " +
          "Sistem akan membentuk jurnal kredit ke akun kas/bank.",
      },
      { status: 400 },
    );
  }

  /* =========================
     CEK NO VOUCHER
  ========================= */

  const { data: existing, error: existingError } = await db
    .from("kasbon_direksi")
    .select("id")
    .eq("no_voucher", no_voucher)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      {
        error: `Gagal mengecek nomor voucher: ${existingError.message}`,
      },
      { status: 500 },
    );
  }

  if (existing) {
    return NextResponse.json(
      {
        error: `No voucher ${no_voucher} sudah digunakan`,
      },
      { status: 409 },
    );
  }

  /* =========================
     INSERT KASBON
  ========================= */

  const { data: kasbon, error: insertError } = await db
    .from("kasbon_direksi")
    .insert({
      tanggal,
      deskripsi,
      no_voucher,
      debit,
      kredit,
    })
    .select("id")
    .single();

  if (insertError || !kasbon) {
    return NextResponse.json(
      {
        error: insertError?.message ?? "Gagal simpan kasbon direksi",
      },
      { status: 500 },
    );
  }

  /* =========================
     AUTO JURNAL
  ========================= */

  let jurnalId: number;

  try {
    jurnalId = await postKasbonDireksi(
      tanggal,
      `KD-${no_voucher}`,
      `Kasbon Direksi - ${deskripsi}`,
      debit,
      id_coa_kas,
    );
  } catch (journalError: unknown) {
    const message =
      journalError instanceof Error
        ? journalError.message
        : "Gagal membuat jurnal kasbon direksi";

    /*
     * Catatan:
     * INSERT kasbon dan posting jurnal dilakukan terpisah.
     * Jika jurnal gagal, data kasbon sudah terlanjur masuk.
     *
     * Jangan menganggap transaksi atomic sebelum proses
     * ini dipindahkan ke RPC/transaction database.
     */

    return NextResponse.json(
      {
        error: message,
        id_kasbon: kasbon.id,
      },
      { status: 500 },
    );
  }

  if (!jurnalId) {
    return NextResponse.json(
      {
        error: "Jurnal kasbon direksi tidak terbentuk",
        id_kasbon: kasbon.id,
      },
      { status: 500 },
    );
  }

  /* =========================
     SUCCESS
  ========================= */

  return NextResponse.json({
    success: true,
    id_kasbon: kasbon.id,
    jurnal_id: jurnalId,
    id_coa_piutang: 2517,
    id_coa_kas: id_coa_kas,
    message: "Kasbon Direksi berhasil disimpan & jurnal terbentuk",
  });
}
