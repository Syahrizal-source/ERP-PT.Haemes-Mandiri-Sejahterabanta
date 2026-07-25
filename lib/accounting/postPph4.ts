import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph4, type Pph4Input } from "@/lib/validators/pph4";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST PPH4
========================= */

export async function postPph4(
  input: Pph4Input,
  pph4Id: number,
): Promise<number> {
  /* =========================
     HITUNG ULANG (ANTI MANIPULASI)
  ========================= */

  const nilaiPph4: number = hitungPph4(input);

  const nilaiFinal: number = Math.max(0, nilaiPph4);

  if (nilaiFinal <= 0) {
    throw new Error("Nilai PPh4 tidak valid");
  }

  /* =========================
     AMBIL COA MAPPING
  ========================= */

  const coaBeban = await getCoaMappingDetail("PAJAK_PPH4", "BEBAN");

  const coaHutang = await getCoaMappingDetail("PAJAK_PPH4", "HUTANG");

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
    throw new Error("Jurnal PPh4 tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId: number = await postJournal({
    tanggal: input.tanggal_transaksi,
    no_bukti: `PPH4-${pph4Id}`,
    keterangan: `PPh4 - ${input.jenis_objek}`,
    sumber: "PAJAK_PPH4",
    modul: "PAJAK_PPH4",
    lines,
  });

  return jurnalId;
}
