import { postJournal } from "./postJournal";
import { getCoaPembayaranPpn } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN PPN
 * ============================================================
 *
 * Jurnal pembayaran PPN:
 *
 * Debit:
 *   53 - 21301 Hutang Pajak PPN
 *
 * Kredit:
 *   COA Kas/Bank DETAIL yang dipilih user
 *
 * Tidak menggunakan:
 *   - 2380 - 12020 PPN Masukan
 *   - 2266 - 62004 Beban Pajak PPN
 *   - 3    - 11100 Kas HEADER
 *   - 2722 - 21300 Utang Pajak HEADER
 *   - 1210 - 21306 Hutang PPN Proyek
 *   - PPh23
 *   - PPh4
 *
 * Relasi pembayaran:
 *   pembayaran_ppn.id_ppn
 *   pembayaran_ppn.id_jurnal
 *
 * ppn.id tidak dimasukkan ke jurnal.ref_id karena:
 *   ppn.id        = BIGINT
 *   jurnal.ref_id = UUID
 */
export async function postPembayaranPpn(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idPpn: number,
  idCoaKas: number,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal.trim()) {
    throw new Error("Tanggal pembayaran PPN wajib diisi");
  }

  if (!noBukti.trim()) {
    throw new Error("Nomor bukti pembayaran PPN wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan pembayaran PPN wajib diisi");
  }

  if (!Number.isInteger(idPpn) || idPpn <= 0) {
    throw new Error("ID PPN tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPN tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPN tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN PPN
  // ==========================================================
  //
  // COA hutang:
  //   PPN / HUTANG
  //   -> 53 - 21301 Hutang Pajak PPN
  //
  // COA kas:
  //   -> COA kas/bank DETAIL pilihan user
  //

  const coaPembayaran = await getCoaPembayaranPpn(idCoaKas);

  // ==========================================================
  // SAFETY GUARD COA HUTANG PPN
  // ==========================================================

  if (coaPembayaran.id_coa_hutang !== 53) {
    throw new Error(
      `COA pembayaran PPN tidak sesuai. ` +
        `COA hutang yang diperoleh adalah id_coa=${coaPembayaran.id_coa_hutang}. ` +
        `COA yang diwajibkan adalah 53 - 21301 Hutang Pajak PPN.`,
    );
  }

  // ==========================================================
  // SAFETY GUARD COA KAS
  // ==========================================================
  //
  // 3 = 11100 Kas HEADER.
  // Tidak boleh digunakan untuk jurnal detail.
  //

  if (coaPembayaran.id_coa_kas === 3) {
    throw new Error(
      "COA pembayaran PPN tidak boleh menggunakan " +
        "3 - 11100 Kas karena merupakan COA HEADER. " +
        "Gunakan COA kas/bank DETAIL.",
    );
  }

  // ==========================================================
  // JURNAL PEMBAYARAN PPN
  // ==========================================================
  //
  // Dr 53  - 21301 Hutang Pajak PPN
  // Cr XXX - COA Kas/Bank DETAIL
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

  const totalDebit = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.debit,
    0,
  );

  const totalKredit = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.kredit,
    0,
  );

  const selisih = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal pembayaran PPN tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // Sesuai JurnalSumber:
  //   "PAJAK_PPN"
  //
  // BUKAN:
  //   "PPN"
  //
  // idPpn tidak dimasukkan ke ref_id karena:
  //   ppn.id        = BIGINT
  //   jurnal.ref_id = UUID
  //
  // Relasi pembayaran:
  //   pembayaran_ppn.id_ppn
  //   pembayaran_ppn.id_jurnal
  //

  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PAJAK_PPN",
    modul: "PPN",
    ref_id: null,
    lines,
  });
}
