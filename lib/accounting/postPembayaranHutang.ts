import { postJournal } from "./postJournal";
import { getCoaPembayaranHutang } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN HUTANG VENDOR
 * ============================================================
 *
 * Jurnal:
 *
 * Debit  : HUTANG/HUTANG -> 2747 Hutang Vendor
 * Kredit : COA Kas/Bank DETAIL yang dipilih user
 *
 * Tidak menggunakan:
 * - PPN
 * - PPh23
 * - COA 49 Hutang Usaha HEADER
 * - COA 3 Kas HEADER
 * - COA 2570 Hutang Armada
 *
 * id_hutang TIDAK dimasukkan ke jurnal.ref_id karena:
 *
 * hutang.id_hutang = bigint
 * jurnal.ref_id    = uuid
 *
 * Relasi pembayaran terhadap hutang disimpan di:
 *
 * pembayaran_hutang.id_hutang
 */
export async function postPembayaranHutang(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idHutang: number,
  idCoaKas: number,
  idVendor?: number | null,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal || tanggal.trim() === "") {
    throw new Error("Tanggal pembayaran hutang wajib diisi");
  }

  if (!noBukti || noBukti.trim() === "") {
    throw new Error("Nomor bukti pembayaran hutang wajib diisi");
  }

  if (!keterangan || keterangan.trim() === "") {
    throw new Error("Keterangan pembayaran hutang wajib diisi");
  }

  if (!Number.isInteger(idHutang) || idHutang <= 0) {
    throw new Error("ID hutang tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran hutang tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN
  // ==========================================================
  //
  // Backend menentukan:
  //
  // HUTANG/HUTANG
  //       ↓
  // 2747 Hutang Vendor
  //
  // idCoaKas:
  //       ↓
  // COA Kas/Bank DETAIL pilihan user
  // ==========================================================

  const coaPembayaran = await getCoaPembayaranHutang(idCoaKas);

  // ==========================================================
  // JURNAL PEMBAYARAN
  // ==========================================================
  //
  // Contoh:
  //
  // Dr 2747 Hutang Vendor
  // Cr 11205 BNI - 1918768145
  //
  // Tidak ada PPN.
  // Tidak ada PPh23.
  // ==========================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaPembayaran.id_coa_hutang,
      debit: nominal,
      kredit: 0,
      id_vendor: idVendor ?? null,
    },
    {
      id_coa: coaPembayaran.id_coa_kas,
      debit: 0,
      kredit: nominal,
      id_vendor: idVendor ?? null,
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
      `Jurnal pembayaran hutang tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // PENTING:
  //
  // ref_id = null
  //
  // Jangan:
  //
  // ref_id: String(idHutang)
  //
  // karena jurnal.ref_id adalah UUID sedangkan
  // hutang.id_hutang adalah BIGINT.
  // ==========================================================

  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,

    sumber: "PEMBAYARAN_HUTANG",

    modul: "PEMBAYARAN_HUTANG",

    ref_id: null,

    lines,
  });
}
