import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

type RAPInput = {
  id_proyek: string;
  nama_item: string;
  kategori: string;
  qty: number;
  harga: number;
  tanggal: string;
};

export async function postRAP(input: RAPInput): Promise<number> {
  const qty = Math.max(0, Number(input.qty));
  const harga = Math.max(0, Number(input.harga));
  const total = qty * harga;

  if (total <= 0) {
    throw new Error("Nilai RAP tidak valid");
  }

  /* =========================
     COA MAPPING (ERP STYLE)
  ========================= */
  const coaBeban = await getCoaMappingDetail("PROYEK", "BEBAN");
  const coaKas = await getCoaMappingDetail("PROYEK", "KAS");

  const lines: JurnalLine[] = [];

  /* =========================
     BEBAN (DEBIT)
  ========================= */
  lines.push({
    id_coa: coaBeban.id_coa,
    debit: total,
    kredit: 0,
    id_proyek: input.id_proyek,
  });

  /* =========================
     KAS (KREDIT)
  ========================= */
  lines.push({
    id_coa: coaKas.id_coa,
    debit: 0,
    kredit: total,
    id_proyek: input.id_proyek,
  });

  /* =========================
     ANTI TIDAK BALANCE
  ========================= */
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal RAP tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */
  const jurnalId = await postJournal({
    tanggal: input.tanggal,
    no_bukti: `RAP-${Date.now()}`,
    keterangan: `RAP Proyek - ${input.nama_item}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    id_proyek: input.id_proyek,
    lines,
  });

  return jurnalId;
}
