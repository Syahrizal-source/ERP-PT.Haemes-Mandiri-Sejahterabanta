import { postJournal } from "./postJournal";
import { getCoaPembayaranPph21 } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN PPH21
 * ============================================================
 *
 * Jurnal pembayaran PPh21:
 *
 * Debit:
 *   PAJAK / HUTANG
 *   -> 54 - 21302 Hutang Pajak PPh 21
 *
 * Kredit:
 *   COA Kas/Bank DETAIL yang dipilih user
 *
 * ============================================================
 * MAPPING DATABASE
 * ============================================================
 *
 * PAJAK / HUTANG
 *   -> 54
 *   -> 21302 Hutang Pajak PPh 21
 *
 * PAJAK / KAS
 *   -> 3
 *   -> 11100 Kas
 *   -> HEADER
 *
 * Mapping PAJAK / KAS tidak digunakan langsung sebagai
 * COA jurnal pembayaran karena id_coa 3 adalah HEADER.
 *
 * COA kas/bank aktual berasal dari idCoaKas yang dipilih user
 * dan divalidasi oleh getCoaPembayaranPph21().
 *
 * ============================================================
 * COA PPH21 YANG TIDAK BOLEH DIGUNAKAN
 * ============================================================
 *
 * 2263 - 62001 - Beban Pajak PPh21
 *   -> akun BEBAN, bukan akun pelunasan hutang
 *
 * 1212 - 21307 - Hutang PPh21 Proyek
 *   -> akun khusus transaksi Proyek
 *
 * 3 - 11100 - Kas
 *   -> COA HEADER
 *
 * 2722 - 21300 - Utang Pajak
 *   -> COA HEADER
 *
 * ============================================================
 * PADA SAAT PEMBAYARAN
 * ============================================================
 *
 *   DEBIT
 *       54 - 21302 Hutang Pajak PPh 21
 *
 *   KREDIT
 *       COA kas/bank DETAIL aktual
 *
 * Hanya 2 ayat.
 *
 * Tidak ada:
 * - Beban PPh21
 * - PPN
 * - PPh23
 * - PPh4
 * - Hutang PPh21 Proyek
 * - Kas HEADER
 *
 * ============================================================
 * RELASI PPH21
 * ============================================================
 *
 * idPph21 tidak dimasukkan ke jurnal.ref_id karena:
 *
 *   pph21.id     = BIGINT
 *   jurnal.ref_id = UUID
 *
 * Relasi pembayaran terhadap PPh21 disimpan melalui:
 *
 *   pembayaran_pph21.id_pph21
 *   pembayaran_pph21.id_jurnal
 */
export async function postPembayaranPph21(
  tanggal: string,
  noBukti: string,
  keterangan: string,
  nominal: number,
  idPph21: number,
  idCoaKas: number,
): Promise<number> {
  // ==========================================================
  // VALIDASI INPUT
  // ==========================================================

  if (!tanggal.trim()) {
    throw new Error("Tanggal pembayaran PPh21 wajib diisi");
  }

  if (!noBukti.trim()) {
    throw new Error("Nomor bukti pembayaran PPh21 wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan pembayaran PPh21 wajib diisi");
  }

  if (!Number.isInteger(idPph21) || idPph21 <= 0) {
    throw new Error("ID PPh21 tidak valid");
  }

  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA kas/bank pembayaran PPh21 tidak valid");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran PPh21 tidak valid");
  }

  // ==========================================================
  // RESOLVE COA PEMBAYARAN PPH21
  // ==========================================================
  //
  // COA hutang:
  //
  //   PAJAK / HUTANG
  //   -> 54 - 21302 Hutang Pajak PPh 21
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
  const coaPembayaran = await getCoaPembayaranPph21(idCoaKas);

  // ==========================================================
  // SAFETY GUARD COA PPH21
  // ==========================================================
  //
  // COA pembayaran PPh21 WAJIB:
  //
  //   54 - 21302 Hutang Pajak PPh 21
  //
  if (coaPembayaran.id_coa_hutang !== 54) {
    throw new Error(
      `COA pembayaran PPh21 tidak sesuai. ` +
        `COA hutang yang diperoleh adalah ` +
        `id_coa=${coaPembayaran.id_coa_hutang}, ` +
        `sedangkan yang diwajibkan adalah ` +
        `54 - 21302 Hutang Pajak PPh 21.`,
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
      "COA pembayaran PPh21 tidak boleh menggunakan " +
        "3 - 11100 Kas karena merupakan COA HEADER. " +
        "Gunakan COA kas/bank DETAIL.",
    );
  }

  // ==========================================================
  // JURNAL PEMBAYARAN PPH21
  // ==========================================================
  //
  // Contoh:
  //
  // Dr 54  - 21302 Hutang Pajak PPh 21
  // Cr 170 - BNI - 1918768145
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
      `Jurnal pembayaran PPh21 tidak balance. ` +
        `Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  // ==========================================================
  // POST JURNAL
  // ==========================================================
  //
  // ref_id sengaja null karena:
  //
  //   pph21.id      = BIGINT
  //   jurnal.ref_id = UUID
  //
  // Relasi pembayaran disimpan di:
  //
  //   pembayaran_pph21.id_pph21
  //   pembayaran_pph21.id_jurnal
  //
  // Sumber:
  //
  //   PAJAK_PPH21
  //
  // Modul:
  //
  //   PAJAK_PPH21
  //
  return postJournal({
    tanggal,
    no_bukti: noBukti,
    keterangan,
    sumber: "PAJAK",
    modul: "PAJAK_PPH21",
    ref_id: null,
    lines,
  });
}
