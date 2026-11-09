import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  rekeningKoranSchema,
  normalizeRekeningKoran,
  hitungSaldoBaru,
  validasiJenis,
  type RekeningKoranInput,
} from "@/lib/validators/rekeningKoran";

import {
  postRekeningKoran,
  type JenisTransaksiRekeningKoran,
} from "@/lib/accounting/postRekeningKoran";

/* ============================================================
 * RESPONSE TYPE
 * ============================================================ */

type RekeningKoranRow = {
  id: number;
  id_rekening: number;
  tanggal: string;
  deskripsi: string;
  debit: number;
  kredit: number;
  saldo: number;
  jenis: string;
  id_jurnal: number | null;
  created_at: string;
};

/* ============================================================
 * GET
 * ============================================================ */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("rekening_koran")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: `Gagal mengambil rekening koran: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json((data ?? []) as RekeningKoranRow[]);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak diketahui";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ============================================================
 * POST
 * ============================================================ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* ========================================================
     * PARSE REQUEST
     * ======================================================== */

    const body: unknown = await req.json();

    const parsed = rekeningKoranSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data tidak valid",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input: RekeningKoranInput = parsed.data;

    /* ========================================================
     * NORMALISASI
     * ======================================================== */

    const dataNorm = normalizeRekeningKoran(input);

    /* ========================================================
     * VALIDASI JENIS
     * ======================================================== */

    validasiJenis(dataNorm);

    const jenis: JenisTransaksiRekeningKoran = dataNorm.jenis;

    const debit: number = dataNorm.debit;

    const kredit: number = dataNorm.kredit;

    /* ========================================================
     * VALIDASI DEBIT / KREDIT
     * ======================================================== */

    if (!Number.isFinite(debit) || debit < 0) {
      throw new Error("Nilai debit rekening koran tidak valid.");
    }

    if (!Number.isFinite(kredit) || kredit < 0) {
      throw new Error("Nilai kredit rekening koran tidak valid.");
    }

    if (debit > 0 && kredit > 0) {
      throw new Error(
        "Debit dan kredit rekening koran tidak boleh sama-sama memiliki nilai.",
      );
    }

    if (debit === 0 && kredit === 0) {
      throw new Error("Debit atau kredit rekening koran wajib memiliki nilai.");
    }

    /* ========================================================
     * VALIDASI JENIS VS DEBIT / KREDIT
     * ======================================================== */

    if (jenis === "MASUK" && (debit <= 0 || kredit !== 0)) {
      throw new Error(
        "Transaksi MASUK harus memiliki debit dan kredit harus 0.",
      );
    }

    if (jenis !== "MASUK" && (kredit <= 0 || debit !== 0)) {
      throw new Error(
        `Transaksi ${jenis} harus memiliki kredit dan debit harus 0.`,
      );
    }

    /* ========================================================
     * VALIDASI REKENING BANK
     *
     * COA BANK AKTUAL SELALU DIAMBIL DARI:
     *
     *   rekening_bank.id_coa
     *
     * BUKAN:
     *
     *   REKENING_KORAN / BANK
     *
     * Mapping BANK menunjuk ke COA header 11200 Bank,
     * sehingga tidak boleh digunakan sebagai COA posting.
     * ======================================================== */

    const { data: rekeningBank, error: rekeningBankError } = await db
      .from("rekening_bank")
      .select("id, id_coa, nama_bank, no_rekening, nama_pemilik, aktif")
      .eq("id", dataNorm.id_rekening)
      .maybeSingle();

    if (rekeningBankError) {
      throw new Error(
        `Gagal mengambil rekening bank: ${rekeningBankError.message}`,
      );
    }

    if (!rekeningBank) {
      throw new Error(
        `Rekening bank tidak ditemukan (id=${dataNorm.id_rekening}).`,
      );
    }

    if (!rekeningBank.aktif) {
      throw new Error(
        `Rekening bank tidak aktif: ` +
          `${rekeningBank.nama_bank} - ` +
          `${rekeningBank.no_rekening}`,
      );
    }

    /* ========================================================
     * VALIDASI COA BANK
     * ======================================================== */

    const idCoaBank: number = Number(rekeningBank.id_coa);

    if (!Number.isInteger(idCoaBank) || idCoaBank <= 0) {
      throw new Error(
        `Rekening ${rekeningBank.nama_bank} - ` +
          `${rekeningBank.no_rekening} belum memiliki ` +
          `COA bank detail yang valid.`,
      );
    }

    const { data: coaBank, error: coaBankError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("id_coa", idCoaBank)
      .maybeSingle();

    if (coaBankError) {
      throw new Error(
        `Gagal memvalidasi COA bank ${idCoaBank}: ` + coaBankError.message,
      );
    }

    if (!coaBank) {
      throw new Error(`COA bank tidak ditemukan (id_coa=${idCoaBank}).`);
    }

    if (!coaBank.aktif) {
      throw new Error(
        `COA bank tidak aktif: ` + `${coaBank.kode} - ${coaBank.nama}.`,
      );
    }

    if (!coaBank.is_cash) {
      throw new Error(
        `COA rekening bukan akun kas/bank: ` +
          `${coaBank.kode} - ${coaBank.nama}.`,
      );
    }

    if (coaBank.is_header) {
      throw new Error(
        `COA rekening bank tidak boleh berupa header: ` +
          `${coaBank.kode} - ${coaBank.nama}.`,
      );
    }

    /* ========================================================
     * COA LAWAN
     *
     * MASUK / KELUAR:
     *   berasal dari id_coa_lawan transaksi.
     *
     * BIAYA_BANK / PAJAK_BANK:
     *   ditentukan oleh coa_mapping di
     *   postRekeningKoran().
     * ======================================================== */

    const idCoaLawan: number | undefined =
      jenis === "BIAYA_BANK" || jenis === "PAJAK_BANK"
        ? undefined
        : dataNorm.id_coa_lawan;

    if ((jenis === "MASUK" || jenis === "KELUAR") && idCoaLawan === undefined) {
      throw new Error(`COA lawan wajib dipilih untuk transaksi ${jenis}.`);
    }

    /* ========================================================
     * SALDO SEBELUMNYA
     * ======================================================== */

    const { data: lastRow, error: lastRowError } = await db
      .from("rekening_koran")
      .select("saldo")
      .eq("id_rekening", dataNorm.id_rekening)
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRowError) {
      throw new Error(
        `Gagal mengambil saldo rekening sebelumnya: ` + lastRowError.message,
      );
    }

    const saldoSebelumnya: number =
      lastRow?.saldo !== undefined && lastRow.saldo !== null
        ? Number(lastRow.saldo)
        : 0;

    if (!Number.isFinite(saldoSebelumnya)) {
      throw new Error("Saldo rekening sebelumnya tidak valid.");
    }

    const saldoBaru: number = hitungSaldoBaru(saldoSebelumnya, dataNorm);

    if (!Number.isFinite(saldoBaru)) {
      throw new Error("Saldo baru rekening koran tidak valid.");
    }

    /* ========================================================
     * SIMPAN REKENING KORAN
     * ======================================================== */

    const { data, error } = await db
      .from("rekening_koran")
      .insert({
        id_rekening: dataNorm.id_rekening,

        tanggal: dataNorm.tanggal,

        deskripsi: dataNorm.deskripsi,

        debit: dataNorm.debit,

        kredit: dataNorm.kredit,

        saldo: saldoBaru,

        jenis: dataNorm.jenis,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyimpan rekening koran.");
    }

    /* ========================================================
     * POST JURNAL
     * ======================================================== */

    try {
      const nominalJurnal: number = jenis === "MASUK" ? debit : kredit;

      /*
       * IMPORTANT:
       *
       * postRekeningKoran() menggunakan parameter
       * positional:
       *
       * 1. tanggal
       * 2. noBukti
       * 3. keterangan
       * 4. nominal
       * 5. idRekening
       * 6. jenis
       * 7. idCoaLawan
       */

      const jurnalId: number = await postRekeningKoran(
        dataNorm.tanggal,
        `RK-${data.id}`,
        dataNorm.deskripsi,
        nominalJurnal,
        dataNorm.id_rekening,
        jenis,
        idCoaLawan,
      );

      /* ======================================================
       * SIMPAN ID JURNAL
       * ====================================================== */

      const { error: updateJournalError } = await db
        .from("rekening_koran")
        .update({
          id_jurnal: jurnalId,
        })
        .eq("id", data.id);

      if (updateJournalError) {
        throw new Error(
          `Jurnal berhasil dibuat, tetapi ID jurnal gagal ` +
            `disimpan ke rekening koran: ` +
            updateJournalError.message,
        );
      }

      /* ======================================================
       * RESPONSE SUKSES
       * ====================================================== */

      return NextResponse.json({
        message: "Rekening koran dan jurnal berhasil ditambahkan",

        data: {
          ...data,

          id_jurnal: jurnalId,

          id_coa_bank: idCoaBank,

          coa_bank: {
            kode: coaBank.kode,

            nama: coaBank.nama,
          },
        },
      });
    } catch (err: unknown) {
      console.error("JURNAL REKENING KORAN ERROR:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Gagal membuat jurnal rekening koran.";

      return NextResponse.json(
        {
          error: "Rekening koran tersimpan tetapi jurnal gagal dibuat.",

          detail: message,

          id_rekening_koran: data.id,
        },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan tidak diketahui";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
