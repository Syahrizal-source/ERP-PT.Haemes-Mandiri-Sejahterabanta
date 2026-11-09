import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";
import { db } from "@/lib/supabase/server";

/**
 * ============================================================
 * JENIS TRANSAKSI REKENING KORAN
 * ============================================================
 */
export type JenisTransaksiRekeningKoran =
  | "MASUK"
  | "KELUAR"
  | "BIAYA_BANK"
  | "PAJAK_BANK";

/**
 * ============================================================
 * POST REKENING KORAN
 * ============================================================
 *
 * Prinsip COA:
 *
 * 1. COA BANK
 *    Tidak menggunakan:
 *
 *      REKENING_KORAN / BANK
 *
 *    karena mapping tersebut menunjuk ke COA 4 / 11200 Bank
 *    yang merupakan header.
 *
 *    COA bank aktual diambil dari:
 *
 *      rekening_koran.id_rekening
 *             ↓
 *      rekening_bank.id
 *             ↓
 *      rekening_bank.id_coa
 *
 * 2. COA LAWAN UNTUK BIAYA
 *      REKENING_KORAN / BIAYA
 *
 * 3. COA LAWAN UNTUK PAJAK
 *      REKENING_KORAN / PAJAK
 *
 * 4. MASUK / KELUAR
 *    Harus menerima idCoaLawan dari transaksi.
 *
 *    Tidak boleh menebak COA lawan karena:
 *      - bisa piutang
 *      - bisa pendapatan
 *      - bisa pinjaman
 *      - bisa transfer
 *      - bisa akun lainnya
 *
 * ============================================================
 */
export async function postRekeningKoran(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idRekening: number,
  jenis: JenisTransaksiRekeningKoran,
  idCoaLawan?: number,
): Promise<number> {
  /**
   * ==========================================================
   * VALIDASI NOMINAL
   * ==========================================================
   */
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal rekening koran tidak valid");
  }

  /**
   * ==========================================================
   * VALIDASI REKENING
   * ==========================================================
   */
  if (!Number.isInteger(idRekening) || idRekening <= 0) {
    throw new Error("ID rekening bank tidak valid");
  }

  /**
   * ==========================================================
   * AMBIL REKENING BANK
   * ==========================================================
   *
   * COA bank aktual berasal dari rekening_bank.
   *
   * Tidak menggunakan:
   *
   *   REKENING_KORAN / BANK
   */
  const { data: rekening, error: rekeningError } = await db
    .from("rekening_bank")
    .select("id, id_coa, nama_bank, no_rekening, nama_pemilik, aktif")
    .eq("id", idRekening)
    .maybeSingle();

  if (rekeningError) {
    throw new Error(
      `Gagal mengambil rekening bank ${idRekening}: ${rekeningError.message}`,
    );
  }

  if (!rekening) {
    throw new Error(`Rekening bank tidak ditemukan (id=${idRekening})`);
  }

  if (!rekening.aktif) {
    throw new Error(
      `Rekening bank tidak aktif: ${rekening.nama_bank} - ${rekening.no_rekening}`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI ID COA BANK
   * ==========================================================
   */
  const idCoaBank: number = Number(rekening.id_coa);

  if (!Number.isInteger(idCoaBank) || idCoaBank <= 0) {
    throw new Error(
      `Rekening bank ${rekening.nama_bank} - ${rekening.no_rekening} ` +
        `belum memiliki COA yang valid.`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI COA BANK
   * ==========================================================
   *
   * COA bank harus:
   *   - tersedia
   *   - aktif
   *   - is_cash = true
   *   - bukan header
   */
  const { data: coaBank, error: coaBankError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header, normal_balance")
    .eq("id_coa", idCoaBank)
    .maybeSingle();

  if (coaBankError) {
    throw new Error(
      `Gagal memvalidasi COA bank ${idCoaBank}: ${coaBankError.message}`,
    );
  }

  if (!coaBank) {
    throw new Error(`COA bank tidak ditemukan (id_coa=${idCoaBank}).`);
  }

  if (!coaBank.aktif) {
    throw new Error(`COA bank tidak aktif: ${coaBank.kode} - ${coaBank.nama}`);
  }

  if (!coaBank.is_cash) {
    throw new Error(
      `COA rekening bukan akun kas/bank: ` +
        `${coaBank.kode} - ${coaBank.nama}`,
    );
  }

  if (coaBank.is_header) {
    throw new Error(
      `COA rekening bank tidak boleh berupa header: ` +
        `${coaBank.kode} - ${coaBank.nama}`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI COA LAWAN
   * ==========================================================
   */
  let idCoaLawanFinal: number;

  if (jenis === "BIAYA_BANK") {
    /**
     * --------------------------------------------------------
     * BIAYA BANK
     * --------------------------------------------------------
     *
     * Dr COA mapping BIAYA
     * Cr COA bank aktual
     */
    const biaya = await getCoaMappingDetail("REKENING_KORAN", "BIAYA");

    idCoaLawanFinal = biaya.id_coa;
  } else if (jenis === "PAJAK_BANK") {
    /**
     * --------------------------------------------------------
     * PAJAK BANK
     * --------------------------------------------------------
     *
     * Dr COA mapping PAJAK
     * Cr COA bank aktual
     */
    const pajak = await getCoaMappingDetail("REKENING_KORAN", "PAJAK");

    idCoaLawanFinal = pajak.id_coa;
  } else {
    /**
     * --------------------------------------------------------
     * MASUK / KELUAR
     * --------------------------------------------------------
     *
     * Untuk transaksi umum, COA lawan wajib ditentukan
     * oleh transaksi.
     *
     * Tidak menggunakan mapping BANK.
     */
    if (
      idCoaLawan === undefined ||
      !Number.isInteger(idCoaLawan) ||
      idCoaLawan <= 0
    ) {
      throw new Error(
        `COA lawan wajib dipilih untuk transaksi Rekening Koran ${jenis}.`,
      );
    }

    idCoaLawanFinal = idCoaLawan;
  }

  /**
   * ==========================================================
   * VALIDASI COA LAWAN
   * ==========================================================
   */
  const { data: coaLawan, error: coaLawanError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header")
    .eq("id_coa", idCoaLawanFinal)
    .maybeSingle();

  if (coaLawanError) {
    throw new Error(
      `Gagal memvalidasi COA lawan ${idCoaLawanFinal}: ${coaLawanError.message}`,
    );
  }

  if (!coaLawan) {
    throw new Error(`COA lawan tidak ditemukan (id_coa=${idCoaLawanFinal}).`);
  }

  if (!coaLawan.aktif) {
    throw new Error(
      `COA lawan tidak aktif: ${coaLawan.kode} - ${coaLawan.nama}`,
    );
  }

  /**
   * COA lawan akan masuk ke jurnal_detail sehingga tidak boleh
   * berupa header.
   */
  if (coaLawan.is_header) {
    throw new Error(
      `COA lawan tidak boleh berupa header: ` +
        `${coaLawan.kode} - ${coaLawan.nama}`,
    );
  }

  /**
   * ==========================================================
   * BENTUK JURNAL
   * ==========================================================
   */
  const lines: JurnalLine[] = [];

  if (jenis === "MASUK") {
    /**
     * Uang masuk ke bank:
     *
     * Dr Bank
     * Cr COA Lawan
     */
    lines.push(
      {
        id_coa: idCoaBank,
        debit: nominal,
        kredit: 0,
      },
      {
        id_coa: idCoaLawanFinal,
        debit: 0,
        kredit: nominal,
      },
    );
  } else {
    /**
     * Uang keluar dari bank:
     *
     * Dr COA Lawan
     * Cr Bank
     *
     * Berlaku untuk:
     *   KELUAR
     *   BIAYA_BANK
     *   PAJAK_BANK
     */
    lines.push(
      {
        id_coa: idCoaLawanFinal,
        debit: nominal,
        kredit: 0,
      },
      {
        id_coa: idCoaBank,
        debit: 0,
        kredit: nominal,
      },
    );
  }

  /**
   * ==========================================================
   * VALIDASI JOURNAL BALANCE
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
      `Jurnal rekening koran tidak balance. ` +
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
    no_bukti: noBukti,
    keterangan,
    sumber: "REKENING_KORAN",
    modul: "ACCOUNTING",
    lines,
  });
}
