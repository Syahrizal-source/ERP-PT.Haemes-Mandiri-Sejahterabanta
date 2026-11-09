import { postJournal } from "./postJournal";
import { getCoaPembayaranPph25 } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN PPH25
 * ============================================================
 *
 * Jurnal pembayaran PPh25:
 *
 * Debit:
 *   PAJAK_PPH25 / HUTANG
 *   -> 2508 - 21305 Hutang Pajak PPh25
 *
 * Kredit:
 *   COA Kas/Bank DETAIL yang dipilih user
 *
 * ============================================================
 * MAPPING DATABASE
 * ============================================================
 *
 * PAJAK_PPH25 / BEBAN
 *   -> 2507
 *   -> 62005 Beban Pajak PPh25
 *
 * PAJAK_PPH25 / HUTANG
 *   -> 2508
 *   -> 21305 Hutang Pajak PPh25
 *
 * PAJAK_PPH25 / KAS
 *   -> 3
 *   -> 11100 Kas
 *   -> HEADER
 *
 * ============================================================
 * PENTING
 * ============================================================
 *
 * 2507 - 62005 Beban Pajak PPh25
 *   TIDAK digunakan untuk pembayaran.
 *
 * 2508 - 21305 Hutang Pajak PPh25
 *   DIGUNAKAN sebagai DEBIT pembayaran.
 *
 * 3 - 11100 Kas
 *   merupakan HEADER dan tidak boleh menjadi jurnal_detail.
 *
 * COA kas/bank yang dikredit harus merupakan COA DETAIL:
 *   - aktif
 *   - is_cash = true
 *   - is_header = false
 *   - tipe = ASET
 *   - normal_balance = DEBIT
 *
 * ============================================================
 * TIDAK DIGUNAKAN
 * ============================================================
 *
 * - Beban PPh25
 * - PPN
 * - PPh21
 * - PPh23
 * - PPh4
 * - Hutang pajak lain
 * - Kas HEADER
 *
 * ============================================================
 *
 * idPph25 tidak dimasukkan ke jurnal.ref_id karena:
 *
 *   pph25.id     = BIGINT
 *   jurnal.ref_id = UUID
 *
 * Relasi pembayaran:
 *
 *   pembayaran_pph25.id_pph25
 *   pembayaran_pph25.id_jurnal
 *
 * ============================================================
 */

export async function postPembayaranPph25(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idPph25: number,
  idCoaKas: number,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal.trim()) {
    throw new Error("Tanggal pembayaran PPh25 wajib diisi");
  }

  if (!noBukti.trim()) {
    throw new Error("Nomor bukti pembayaran PPh25 wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan pembayaran PPh25 wajib diisi");
  }

  if (!Number.isInteger(idPph25) || idPph25 <= 0) {
    throw new Error("ID PPh25 tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPh25 tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh25 tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN PPH25
  // ==========================================================
  //
  // Backend menentukan:
  //
  // Hutang:
  //   PAJAK_PPH25 / HUTANG
  //   -> 2508 - 21305 Hutang Pajak PPh25
  //
  // Kas:
  //   berdasarkan idCoaKas pilihan user
  //
  // Source of truth:
  //   public.coa_mapping
  //
  // getCoaPembayaranPph25() juga melakukan validasi
  // terhadap COA kas/bank DETAIL.
  //

  const coaPembayaran = await getCoaPembayaranPph25(idCoaKas);

  // ==========================================================
  // SAFETY GUARD COA HUTANG PPH25
  // ==========================================================
  //
  // Wajib:
  //
  //   2508 - 21305 Hutang Pajak PPh25
  //
  // Bukan:
  //
  //   2507 - 62005 Beban Pajak PPh25
  //

  if (coaPembayaran.id_coa_hutang !== 2508) {
    throw new Error(
      `COA pembayaran PPh25 tidak sesuai. ` +
        `COA hutang yang diperoleh adalah ` +
        `id_coa=${coaPembayaran.id_coa_hutang}, ` +
        `sedangkan yang diwajibkan adalah ` +
        `2508 - 21305 Hutang Pajak PPh25.`,
    );
  }

  // ==========================================================
  // SAFETY GUARD COA KAS
  // ==========================================================
  //
  // COA 3:
  //
  //   3 - 11100 Kas
  //
  // merupakan HEADER.
  //
  // Tidak boleh digunakan sebagai jurnal_detail.
  //

  if (coaPembayaran.id_coa_kas === 3) {
    throw new Error(
      "COA pembayaran PPh25 tidak boleh menggunakan " +
        "3 - 11100 Kas karena merupakan COA HEADER. " +
        "Gunakan COA kas/bank DETAIL.",
    );
  }

  // ==========================================================
  // JURNAL PEMBAYARAN PPH25
  // ==========================================================
  //
  // Contoh:
  //
  // Dr 2508 - 21305 Hutang Pajak PPh25
  // Cr 170  - BNI - 1918768145
  //
  // Hanya 2 ayat.
  //

  const lines: JurnalLine[] = [
    {
      id_coa: coaPembayaran.id_coa_hutang,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: coaPembayaran.id_coa_kas,
      debit: 0,
      kredit: nominal,
    },
  ];

  // ==========================================================
  // VALIDASI BALANCE
  // ==========================================================

  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal pembayaran PPh25 tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // ref_id = null karena:
  //
  //   pph25.id      = BIGINT
  //   jurnal.ref_id = UUID
  //
  // Relasi pembayaran disimpan melalui:
  //
  //   pembayaran_pph25.id_pph25
  //   pembayaran_pph25.id_jurnal
  //
  // Sumber dan modul:
  //
  //   PAJAK_PPH25
  //

  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PAJAK_PPH25",
    modul: "PAJAK_PPH25",
    ref_id: null,
    lines,
  });
}
