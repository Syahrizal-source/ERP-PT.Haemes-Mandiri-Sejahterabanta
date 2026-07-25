import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph23, type Pph23Input } from "@/lib/validators/pph23";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST PPH23
========================= */

export async function postPph23(input: Pph23Input): Promise<number> {
  /* =========================
     HITUNG ULANG (ANTI MANIPULASI)
  ========================= */

  const nilaiPph23: number = hitungPph23(input);

  const nilaiFinal: number = Math.max(0, nilaiPph23);

  if (nilaiFinal <= 0) {
    throw new Error("Nilai PPh23 tidak valid");
  }

  /* =========================
     AMBIL COA MAPPING
  ========================= */

  const coaBeban = await getCoaMappingDetail("PAJAK_PPH23", "BEBAN");

  const coaHutang = await getCoaMappingDetail("PAJAK_PPH23", "HUTANG");

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
    throw new Error("Jurnal PPh23 tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId: number = await postJournal({
    tanggal: input.tanggal_transaksi,
    no_bukti: `PPH23-${input.id_vendor}`,
    keterangan: `PPh23 - ${input.jenis_jasa}`,
    sumber: "PAJAK_PPH23",
    modul: "PAJAK_PPH23",
    lines,
  });

  return jurnalId;
}
