import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph21, type Pph21Input } from "@/lib/validators/pph21";
import type { JurnalLine } from "@/types/accounting";

/**
 * POST JURNAL PPH 21
 *
 * Alur:
 * 1. Hitung ulang PPh 21 dari data payroll.
 * 2. Validasi nilai pajak.
 * 3. Ambil COA Beban dan Hutang melalui COA Mapping.
 * 4. Susun jurnal debit dan kredit.
 * 5. Validasi keseimbangan jurnal.
 * 6. Posting jurnal melalui postJournal.
 */
export async function postPph21(input: Pph21Input): Promise<number> {
  // =========================================
  // 1. VALIDASI INPUT DASAR
  // =========================================

  if (!Number.isSafeInteger(input.id_payroll) || input.id_payroll <= 0) {
    throw new Error("ID Payroll tidak valid");
  }

  if (!input.nama.trim()) {
    throw new Error("Nama karyawan wajib diisi");
  }

  if (!input.tanggal.trim()) {
    throw new Error("Tanggal PPh 21 wajib diisi");
  }

  // =========================================
  // 2. HITUNG ULANG PPH 21
  // ANTI MANIPULASI NILAI PAJAK
  // =========================================

  const hasil = hitungPph21(input);

  const nilaiFinal = Math.max(0, hasil.nilai_pph21);

  if (!Number.isFinite(nilaiFinal) || nilaiFinal <= 0) {
    throw new Error("Nilai PPh 21 tidak valid");
  }

  // =========================================
  // 3. NOMOR BUKTI JURNAL
  // =========================================

  const noBukti = `PPH21-${input.id_payroll}-${Date.now()}`;

  // =========================================
  // 4. AMBIL COA MAPPING
  // =========================================

  const coaBeban = await getCoaMappingDetail("PAJAK", "BEBAN");

  const coaHutang = await getCoaMappingDetail("PAJAK", "HUTANG");

  if (!Number.isSafeInteger(coaBeban.id_coa) || coaBeban.id_coa <= 0) {
    throw new Error("COA Beban PPh 21 tidak valid");
  }

  if (!Number.isSafeInteger(coaHutang.id_coa) || coaHutang.id_coa <= 0) {
    throw new Error("COA Hutang PPh 21 tidak valid");
  }

  if (coaBeban.id_coa === coaHutang.id_coa) {
    throw new Error("COA Beban dan Hutang PPh 21 tidak boleh sama");
  }

  // =========================================
  // 5. SUSUN JURNAL
  // =========================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaBeban.id_coa,
      debit: nilaiFinal,
      kredit: 0,
    },
    {
      id_coa: coaHutang.id_coa,
      debit: 0,
      kredit: nilaiFinal,
    },
  ];

  // =========================================
  // 6. VALIDASI BALANCE JURNAL
  // =========================================

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nominal jurnal PPh 21 tidak valid");
  }

  if (Math.abs(totalDebit - totalKredit) > 0.000001) {
    throw new Error("Jurnal PPh 21 tidak balance");
  }

  // =========================================
  // 7. POST JURNAL
  // =========================================

  const jurnalId = await postJournal({
    tanggal: input.tanggal,
    no_bukti: noBukti,
    keterangan: `PPh21 - ${input.nama.trim()}`,
    sumber: "PAJAK",
    modul: "PAJAK",
    lines,
  });

  if (!Number.isSafeInteger(jurnalId) || jurnalId <= 0) {
    throw new Error("Posting jurnal PPh 21 gagal menghasilkan ID jurnal");
  }

  // =========================================
  // 8. KEMBALIKAN ID JURNAL
  // =========================================

  return jurnalId;
}
