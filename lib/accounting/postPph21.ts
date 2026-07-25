import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph21, type Pph21Input } from "@/lib/validators/pph21";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST PPH21
========================= */

export async function postPph21(input: Pph21Input): Promise<number> {
  /* =========================
     HITUNG ULANG (ANTI MANIPULASI)
  ========================= */
  const noBukti = `PPH21-${input.id_payroll}-${Date.now()}`;

  const hasil = hitungPph21(input);

  const nilaiFinal: number = Math.max(0, hasil.nilai_pph21);

  if (nilaiFinal <= 0) {
    throw new Error("Nilai PPh21 tidak valid");
  }

  /* =========================
     AMBIL COA MAPPING
  ========================= */

  const coaBeban = await getCoaMappingDetail("PAJAK", "BEBAN");
  const coaHutang = await getCoaMappingDetail("PAJAK", "HUTANG");

  /* =========================
     JURNAL LINE
  ========================= */

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

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit: number = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit: number = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal PPh21 tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId: number = await postJournal({
    tanggal: input.tanggal,
    no_bukti: noBukti,
    keterangan: `PPh21 - ${input.nama}`,
    sumber: "PAJAK",
    modul: "PAJAK",
    lines,
  });

  return jurnalId;
}
