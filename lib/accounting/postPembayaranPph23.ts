import { postJournal } from "./postJournal";
import { getCoaPembayaranPph23 } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN PPH23
 * ============================================================
 *
 * Jurnal pembayaran PPh23:
 *
 * Debit:
 *   PAJAK_PPH23 / HUTANG
 *   -> 55 - 21303 Hutang Pajak PPh 23
 *
 * Kredit:
 *   COA Kas/Bank DETAIL yang dipilih user
 *
 * Mapping database:
 *
 *   PAJAK_PPH23 / BEBAN
 *       -> 2264
 *       -> 62002 Beban Pajak PPh23
 *
 *   PAJAK_PPH23 / HUTANG
 *       -> 55
 *       -> 21303 Hutang Pajak PPh 23
 *
 *   PAJAK_PPH23 / KAS
 *       -> 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * PENTING:
 *
 *   2264 - 62002 Beban Pajak PPh23
 *       TIDAK digunakan untuk pembayaran.
 *
 *   1213 - 21308 Hutang PPh23 Proyek
 *       TIDAK digunakan untuk pembayaran PPh23 umum.
 *
 *   3 - 11100 Kas
 *       merupakan COA HEADER dan tidak boleh
 *       digunakan sebagai jurnal_detail.
 *
 *   2722 - 21300 Utang Pajak
 *       merupakan COA HEADER dan tidak boleh
 *       digunakan sebagai jurnal_detail.
 *
 * Pada saat pembayaran:
 *
 *   DEBIT
 *       55 - 21303 Hutang Pajak PPh 23
 *
 *   KREDIT
 *       COA kas/bank DETAIL aktual
 *
 * Tidak menggunakan:
 *   - Beban PPh23
 *   - PPN
 *   - PPh4
 *   - Hutang PPh23 Proyek
 *   - Kas HEADER
 *
 * idPph23 tidak dimasukkan ke jurnal.ref_id karena:
 *
 *   pph23.id     = BIGINT
 *   jurnal.ref_id = UUID
 *
 * Relasi pembayaran terhadap PPh23 disimpan melalui:
 *
 *   pembayaran_pph23.id_pph23
 *   pembayaran_pph23.id_jurnal
 */
export async function postPembayaranPph23(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idPph23: number,
  idCoaKas: number,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal.trim()) {
    throw new Error("Tanggal pembayaran PPh23 wajib diisi");
  }

  if (!noBukti.trim()) {
    throw new Error("Nomor bukti pembayaran PPh23 wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan pembayaran PPh23 wajib diisi");
  }

  if (!Number.isInteger(idPph23) || idPph23 <= 0) {
    throw new Error("ID PPh23 tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPh23 tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh23 tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN PPH23
  // ==========================================================
  //
  // COA hutang:
  //
  //   PAJAK_PPH23 / HUTANG
  //   -> 55 - 21303 Hutang Pajak PPh 23
  //
  // COA kas:
  //
  //   berdasarkan idCoaKas yang dipilih user
  //
  //   harus:
  //   - aktif
  //   - is_cash = true
  //   - is_header = false
  //   - tipe = ASET
  //   - normal_balance = DEBIT
  //
  // Source of truth:
  //   public.coa_mapping
  //

  const coaPembayaran = await getCoaPembayaranPph23(idCoaKas);

  // ==========================================================
  // SAFETY GUARD COA PPH23
  // ==========================================================
  //
  // COA pembayaran PPh23 WAJIB:
  //
  //   55 - 21303 Hutang Pajak PPh 23
  //

  if (coaPembayaran.id_coa_hutang !== 55) {
    throw new Error(
      `COA pembayaran PPh23 tidak sesuai. ` +
        `COA hutang yang diperoleh adalah ` +
        `id_coa=${coaPembayaran.id_coa_hutang}, ` +
        `sedangkan yang diwajibkan adalah ` +
        `55 - 21303 Hutang Pajak PPh 23.`,
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
  // merupakan HEADER dan tidak boleh menjadi
  // jurnal_detail.
  //

  if (coaPembayaran.id_coa_kas === 3) {
    throw new Error(
      "COA pembayaran PPh23 tidak boleh menggunakan " +
        "3 - 11100 Kas karena merupakan COA HEADER. " +
        "Gunakan COA kas/bank DETAIL.",
    );
  }

  // ==========================================================
  // JURNAL PEMBAYARAN PPH23
  // ==========================================================
  //
  // Contoh:
  //
  // Dr 55  - 21303 Hutang Pajak PPh 23
  // Cr 170 - BNI - 1918768145
  //
  // Hanya 2 ayat.
  //
  // Tidak ada:
  // - Beban PPh23
  // - PPN
  // - PPh4
  // - Hutang PPh23 Proyek
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
      `Jurnal pembayaran PPh23 tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // ref_id sengaja null karena:
  //
  //   pph23.id      = BIGINT
  //   jurnal.ref_id = UUID
  //
  // Relasi pembayaran disimpan di:
  //
  //   pembayaran_pph23.id_pph23
  //   pembayaran_pph23.id_jurnal
  //
  // Sumber:
  //
  //   PAJAK_PPH23
  //
  // Modul:
  //
  //   PAJAK_PPH23
  //

  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PAJAK_PPH23",
    modul: "PAJAK_PPH23",
    ref_id: null,
    lines,
  });
}
