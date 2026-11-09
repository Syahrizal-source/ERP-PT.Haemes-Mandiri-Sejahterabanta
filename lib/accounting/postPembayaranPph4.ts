import { postJournal } from "./postJournal";
import { getCoaPembayaranPph4 } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN PPH4 AYAT (2)
 * ============================================================
 *
 * Jurnal pembayaran PPh4:
 *
 * Debit:
 *   PAJAK_PPH4 / HUTANG
 *   -> 2504 - 21304 Hutang Pajak PPh4
 *
 * Kredit:
 *   COA Kas/Bank DETAIL yang dipilih user
 *
 * Tidak menggunakan:
 *   - 2265 - 62003 Beban Pajak PPh4
 *   - 3    - 11100 Kas HEADER
 *   - 21300 - Utang Pajak HEADER
 *   - PPN
 *   - PPh23
 *
 * id_pph4 tidak dimasukkan ke jurnal.ref_id karena:
 *   pph4.id       = BIGINT
 *   jurnal.ref_id = UUID
 *
 * Relasi pembayaran terhadap PPh4 disimpan melalui:
 *   pembayaran_pph4.id_pph4
 *   pembayaran_pph4.id_jurnal
 */
export async function postPembayaranPph4(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idPph4: number,
  idCoaKas: number,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal.trim()) {
    throw new Error("Tanggal pembayaran PPh4 wajib diisi");
  }

  if (!noBukti.trim()) {
    throw new Error("Nomor bukti pembayaran PPh4 wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan pembayaran PPh4 wajib diisi");
  }

  if (!Number.isInteger(idPph4) || idPph4 <= 0) {
    throw new Error("ID PPh4 tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPh4 tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh4 tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN PPH4
  // ==========================================================
  //
  // COA hutang:
  //   PAJAK_PPH4 / HUTANG
  //   -> 2504 - 21304 Hutang Pajak PPh4
  //
  // COA kas:
  //   berdasarkan idCoaKas yang dipilih user
  //   dan harus merupakan COA kas/bank DETAIL.
  //
  const coaPembayaran = await getCoaPembayaranPph4(idCoaKas);

  // ==========================================================
  // SAFETY GUARD COA PPH4
  // ==========================================================

  if (coaPembayaran.id_coa_hutang !== 2504) {
    throw new Error(
      `COA pembayaran PPh4 tidak sesuai. ` +
        `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}, ` +
        `sedangkan yang diwajibkan adalah 2504 - 21304 Hutang Pajak PPh4.`,
    );
  }

  if (coaPembayaran.id_coa_kas === 3) {
    throw new Error(
      "COA pembayaran PPh4 tidak boleh menggunakan " +
        "3 - 11100 Kas karena merupakan COA HEADER. " +
        "Gunakan COA kas/bank DETAIL.",
    );
  }

  // ==========================================================
  // JURNAL PEMBAYARAN PPH4
  // ==========================================================
  //
  // Contoh:
  //
  // Dr 2504 - 21304 Hutang Pajak PPh4
  // Cr 170  - 11205 BNI - 1918768145
  //
  // Hanya 2 ayat.
  // Tidak ada beban, PPN, atau PPh23.
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
      `Jurnal pembayaran PPh4 tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // ref_id sengaja null karena:
  //   pph4.id       = BIGINT
  //   jurnal.ref_id = UUID
  //
  // Relasi pembayaran disimpan di:
  //   pembayaran_pph4.id_pph4
  //   pembayaran_pph4.id_jurnal
  //
  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PAJAK_PPH4",
    modul: "PAJAK_PPH4",
    ref_id: null,
    lines,
  });
}
