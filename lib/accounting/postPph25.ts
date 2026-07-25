import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { hitungPph25, type Pph25Input } from "@/lib/validators/pph25";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST PPH25
========================= */

export async function postPph25(input: Pph25Input): Promise<number> {
  /* =========================
     HITUNG ULANG (ANTI MANIPULASI)
  ========================= */

  const nilaiPph25: number = hitungPph25(input);

  const nilaiFinal: number = Math.max(0, nilaiPph25);

  if (nilaiFinal <= 0) {
    throw new Error("Nilai PPh25 tidak valid");
  }

  /* =========================
     AMBIL COA MAPPING
  ========================= */

  const coaBeban = await getCoaMappingDetail("PAJAK_PPH25", "BEBAN");

  const coaHutang = await getCoaMappingDetail("PAJAK_PPH25", "HUTANG");

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
    throw new Error("Jurnal PPh25 tidak balance");
  }

  /* =========================
     FORMAT KETERANGAN
  ========================= */

  const periode: string = `${input.bulan}/${input.tahun}`;

  const keterangan: string = input.keterangan
    ? `PPh25 ${periode} - ${input.keterangan}`
    : `PPh25 ${periode}`;

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId: number = await postJournal({
    tanggal: input.tanggal_transaksi,
    no_bukti: `PPH25-${input.tahun}${String(input.bulan).padStart(2, "0")}`,
    keterangan,
    sumber: "PAJAK_PPH25",
    modul: "PAJAK_PPH25",
    lines,
  });

  return jurnalId;
}
