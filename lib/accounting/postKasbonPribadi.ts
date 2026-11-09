import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";
import { db } from "@/lib/supabase/server";

/**
 * ============================================================
 * POST KASBON PRIBADI
 * ============================================================
 *
 * Jurnal Kasbon Pribadi:
 *
 *   DEBIT
 *   12006 - Piutang Karyawan Internal
 *
 *   KREDIT
 *   COA Kas/Bank yang dipilih pada transaksi
 *
 * COA Piutang:
 *   KASBON_PRIBADI / PIUTANG
 *   → id_coa 2518
 *
 * COA Kas/Bank:
 *   Dipilih per transaksi.
 *   Tidak menggunakan mapping KASBON_PRIBADI / KAS,
 *   karena perusahaan memiliki beberapa akun kas/bank.
 *
 * ============================================================
 */
export async function postKasbonPribadi(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  idCoaKas: number,
): Promise<number> {
  /**
   * ==========================================================
   * VALIDASI NOMINAL
   * ==========================================================
   */
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal kasbon pribadi tidak valid");
  }

  /**
   * ==========================================================
   * VALIDASI COA KAS/BANK
   * ==========================================================
   */
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank kasbon pribadi tidak valid");
  }

  /**
   * ==========================================================
   * AMBIL COA PIUTANG DARI MAPPING
   * ==========================================================
   *
   * KASBON_PRIBADI / PIUTANG
   * → 12006 Piutang Karyawan Internal
   * → id_coa 2518
   *
   * Jangan hardcode id_coa 2518 di jurnal.
   * getCoaMappingDetail() tetap menjadi source of truth.
   */
  const piutang = await getCoaMappingDetail("KASBON_PRIBADI", "PIUTANG");

  /**
   * ==========================================================
   * VALIDASI COA KAS/BANK TRANSAKSI
   * ==========================================================
   *
   * COA kas/bank harus:
   *   - tersedia
   *   - aktif
   *   - is_cash = true
   *   - bukan header
   */
  const { data: kas, error: kasError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (kasError) {
    throw new Error(
      `Gagal memvalidasi COA kas/bank ${idCoaKas}: ${kasError.message}`,
    );
  }

  if (!kas) {
    throw new Error(`COA kas/bank tidak ditemukan (id_coa=${idCoaKas})`);
  }

  if (!kas.aktif) {
    throw new Error(`COA kas/bank tidak aktif: ${kas.kode} - ${kas.nama}`);
  }

  if (!kas.is_cash) {
    throw new Error(`COA bukan akun kas/bank: ${kas.kode} - ${kas.nama}`);
  }

  if (kas.is_header) {
    throw new Error(
      `COA kas/bank tidak boleh berupa header: ${kas.kode} - ${kas.nama}`,
    );
  }

  /**
   * ==========================================================
   * BENTUK JURNAL
   * ==========================================================
   *
   * Kasbon Pribadi:
   *
   *   Dr 12006 Piutang Karyawan Internal
   *   Cr Kas/Bank
   */
  const lines: JurnalLine[] = [
    {
      id_coa: piutang.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: idCoaKas,
      debit: 0,
      kredit: nominal,
    },
  ];

  /**
   * ==========================================================
   * VALIDASI BALANCE
   * ==========================================================
   */
  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal kasbon pribadi tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  /**
   * ==========================================================
   * POST JURNAL
   * ==========================================================
   */
  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "KASBON_PRIBADI",
    modul: "ACCOUNTING",
    lines,
  });
}
