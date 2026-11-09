import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { kasbonPribadiSchema } from "@/lib/validators/kasbon";
import { postKasbonPribadi } from "@/lib/accounting/postKasbonPribadi";

/**
 * ============================================================
 * GET
 * ============================================================
 */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_pribadi")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * ============================================================
 * POST + SALDO + JURNAL
 * ============================================================
 *
 * Flow:
 *
 *   Kasbon Pribadi
 *        │
 *        ├── Debit
 *        │
 *        ▼
 *   KASBON_PRIBADI / PIUTANG
 *        │
 *        ▼
 *   2518 - 12006 Piutang Karyawan Internal
 *        │
 *        │
 *        └───────────────┐
 *                        │
 *                        ▼
 *                  COA Kas/Bank
 *                  dipilih transaksi
 *
 * Jurnal:
 *
 *   Dr 12006 Piutang Karyawan Internal
 *   Cr Kas/Bank pilihan transaksi
 *
 * ============================================================
 */
export async function POST(req: Request): Promise<NextResponse> {
  /**
   * ==========================================================
   * PARSE REQUEST
   * ==========================================================
   */
  const body: unknown = await req.json();

  const parsed = kasbonPribadiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, deskripsi, no_voucher, debit, kredit, id_coa_kas } =
    parsed.data;

  /**
   * ==========================================================
   * VALIDASI NOMINAL
   * ==========================================================
   *
   * Kasbon Pribadi baru harus merupakan transaksi kasbon:
   *
   *   debit > 0
   *   kredit = 0
   *
   * Pengembalian nanti dibuat sebagai flow terpisah.
   */
  if (!Number.isFinite(debit) || debit <= 0) {
    return NextResponse.json(
      {
        error: "Nominal kasbon pribadi harus lebih dari 0",
      },
      { status: 400 },
    );
  }

  if (!Number.isFinite(kredit) || kredit !== 0) {
    return NextResponse.json(
      {
        error: "Kredit kasbon pribadi harus 0 untuk transaksi kasbon",
      },
      { status: 400 },
    );
  }

  /**
   * ==========================================================
   * VALIDASI COA KAS/BANK
   * ==========================================================
   *
   * COA kas/bank berasal dari transaksi.
   *
   * TIDAK menggunakan:
   *
   *   getCoaMappingDetail("KASBON_PRIBADI", "KAS")
   *
   * karena perusahaan memiliki beberapa akun kas/bank.
   */
  if (!Number.isInteger(id_coa_kas) || id_coa_kas <= 0) {
    return NextResponse.json(
      {
        error: "COA kas/bank kasbon pribadi wajib dipilih",
      },
      { status: 400 },
    );
  }

  const { data: kas, error: kasError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .eq("id_coa", id_coa_kas)
    .maybeSingle();

  if (kasError) {
    return NextResponse.json(
      {
        error:
          `Gagal memvalidasi COA kas/bank ${id_coa_kas}: ` + kasError.message,
      },
      { status: 500 },
    );
  }

  if (!kas) {
    return NextResponse.json(
      {
        error: `COA kas/bank tidak ditemukan ` + `(id_coa=${id_coa_kas})`,
      },
      { status: 400 },
    );
  }

  if (!kas.aktif) {
    return NextResponse.json(
      {
        error: `COA kas/bank tidak aktif: ` + `${kas.kode} - ${kas.nama}`,
      },
      { status: 400 },
    );
  }

  if (!kas.is_cash) {
    return NextResponse.json(
      {
        error: `COA bukan akun kas/bank: ` + `${kas.kode} - ${kas.nama}`,
      },
      { status: 400 },
    );
  }

  if (kas.is_header) {
    return NextResponse.json(
      {
        error:
          `COA kas/bank tidak boleh berupa header: ` +
          `${kas.kode} - ${kas.nama}`,
      },
      { status: 400 },
    );
  }

  /**
   * ==========================================================
   * CEK DUPLIKAT NO VOUCHER
   * ==========================================================
   *
   * Walaupun database memiliki unique constraint,
   * pengecekan ini memberikan response API yang lebih jelas.
   */
  const { data: existing, error: existingError } = await db
    .from("kasbon_pribadi")
    .select("id")
    .eq("no_voucher", no_voucher)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      {
        error: `Gagal memeriksa no voucher: ` + existingError.message,
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

  /**
   * ==========================================================
   * HITUNG SALDO
   * ==========================================================
   */
  const { data: last, error: lastError } = await db
    .from("kasbon_pribadi")
    .select("saldo")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    return NextResponse.json(
      {
        error: `Gagal mengambil saldo kasbon pribadi: ` + lastError.message,
      },
      { status: 500 },
    );
  }

  const saldoSebelumnya: number = Number(last?.saldo ?? 0);

  const saldoBaru: number = saldoSebelumnya + debit - kredit;

  /**
   * ==========================================================
   * INSERT KASBON
   * ==========================================================
   *
   * id_coa_kas belum disimpan ke tabel karena schema
   * kasbon_pribadi saat ini belum memiliki kolom tersebut.
   *
   * COA kas tetap digunakan untuk jurnal melalui
   * postKasbonPribadi().
   */
  const { data: kasbon, error: insertError } = await db
    .from("kasbon_pribadi")
    .insert({
      tanggal,
      deskripsi,
      no_voucher,
      debit,
      kredit,
      saldo: saldoBaru,
    })
    .select("id")
    .single();

  if (insertError || !kasbon) {
    return NextResponse.json(
      {
        error: insertError?.message ?? "Gagal simpan kasbon pribadi",
      },
      { status: 500 },
    );
  }

  /**
   * ==========================================================
   * AUTO JURNAL
   * ==========================================================
   *
   * COA piutang:
   *
   *   KASBON_PRIBADI / PIUTANG
   *   → 2518
   *   → 12006 Piutang Karyawan Internal
   *
   * COA kas:
   *
   *   id_coa_kas dari transaksi
   *
   * Jurnal:
   *
   *   Dr 12006 Piutang Karyawan Internal
   *   Cr Kas/Bank
   */
  let jurnalId: number;

  try {
    jurnalId = await postKasbonPribadi(
      tanggal,
      `KP-${no_voucher}`,
      `Kasbon Pribadi - ${deskripsi}`,
      debit,
      id_coa_kas,
    );
  } catch (journalError: unknown) {
    const message: string =
      journalError instanceof Error
        ? journalError.message
        : "Gagal membuat jurnal kasbon pribadi";

    /**
     * Catatan:
     *
     * Insert kasbon dan posting jurnal belum berada
     * dalam satu database transaction.
     *
     * Karena itu jika jurnal gagal, data kasbon sudah
     * terlanjur tersimpan.
     */
    return NextResponse.json(
      {
        error: `Kasbon Pribadi tersimpan, tetapi jurnal gagal dibuat: ${message}`,
        id_kasbon: kasbon.id,
      },
      { status: 500 },
    );
  }

  /**
   * ==========================================================
   * RESPONSE
   * ==========================================================
   */
  return NextResponse.json(
    {
      success: true,
      id_kasbon: kasbon.id,
      jurnal_id: jurnalId,
      id_coa_piutang: 2518,
      id_coa_kas: id_coa_kas,
      message: "Kasbon Pribadi berhasil disimpan & jurnal terbentuk",
    },
    { status: 201 },
  );
}
