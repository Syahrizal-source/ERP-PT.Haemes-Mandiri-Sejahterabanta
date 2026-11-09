import { postJournal } from "./postJournal";
import { getCoaMappingDetail, getCoaPembayaranInvoice } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN INVOICE
 * ============================================================
 *
 * Pembayaran Invoice adalah penerimaan uang dari Customer
 * atas invoice yang sudah diterbitkan.
 *
 * Jurnal:
 *
 *   DEBIT
 *       COA Bank/Kas DETAIL aktual
 *       yang dipilih pada pembayaran_invoice.id_coa_debit
 *
 *   KREDIT
 *       COA Piutang Usaha
 *       dari mapping:
 *
 *       PEMBAYARAN_INVOICE / PIUTANG
 *
 * Tidak menggunakan:
 *
 *   - COA Pendapatan
 *   - COA Beban
 *   - COA Pajak
 *   - COA Hutang
 *
 * Catatan:
 *
 *   idCoaBank berasal dari:
 *
 *       pembayaran_invoice.id_coa_debit
 *
 *   Bukan dari:
 *
 *       id_rekening
 *       rekening_bank.id
 *
 *   COA kredit tidak dikirim dari frontend.
 *   COA kredit selalu diambil melalui coa_mapping.
 */
export async function postPembayaranInvoice(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idCoaBank: number,
): Promise<number> {
  /**
   * ==========================================================
   * VALIDASI NOMINAL
   * ==========================================================
   */
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran invoice tidak valid.");
  }

  /**
   * ==========================================================
   * VALIDASI COA BANK/KAS
   * ==========================================================
   *
   * Fungsi ini memastikan:
   *
   * - COA tersedia
   * - COA aktif
   * - COA merupakan akun kas/bank
   * - COA bukan header
   * - COA merupakan akun detail
   *
   * idCoaBank harus berasal dari:
   *
   *   pembayaran_invoice.id_coa_debit
   */
  const coaPembayaran = await getCoaPembayaranInvoice(idCoaBank);

  /**
   * ==========================================================
   * VALIDASI COA PIUTANG
   * ==========================================================
   *
   * COA kredit TIDAK boleh berasal dari input user.
   *
   * Sumber:
   *
   *   public.coa_mapping
   *
   *   modul    = PEMBAYARAN_INVOICE
   *   kategori = PIUTANG
   *
   * Mapping tersebut menentukan COA Piutang Usaha
   * yang digunakan untuk pelunasan invoice.
   */
  const coaPiutang = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "PIUTANG");

  /**
   * ==========================================================
   * JURNAL PEMBAYARAN INVOICE
   * ==========================================================
   *
   * DEBIT
   *   Bank/Kas DETAIL
   *
   * KREDIT
   *   Piutang Usaha
   *
   * Contoh:
   *
   *   DEBIT
   *     11205 - BNI - 1918768145
   *     Rp111.000
   *
   *   KREDIT
   *     12001 - Piutang Usaha
   *     Rp111.000
   */
  const lines: JurnalLine[] = [
    {
      id_coa: coaPembayaran.id_coa_kas,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: coaPiutang.id_coa,
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
    (sum: number, line: JurnalLine): number => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.kredit,
    0,
  );

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal pembayaran invoice tidak balance.");
  }

  /**
   * ==========================================================
   * POST JURNAL
   * ==========================================================
   *
   * ref_id = null
   *
   * Karena:
   *
   *   invoice.id = BIGINT
   *   jurnal.ref_id = UUID
   *
   * Relasi transaksi tetap disimpan melalui:
   *
   *   pembayaran_invoice.id_invoice
   *   pembayaran_invoice.id_jurnal
   */
  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PEMBAYARAN_INVOICE",
    modul: "PENDAPATAN",
    ref_id: null,
    lines,
  });
}
