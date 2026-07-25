import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postPendapatan(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
  total: number,
): Promise<number> {
  const coaKas = await getCoaMappingDetail("PENDAPATAN", "KAS");
  const coaPendapatan = await getCoaMappingDetail("PENDAPATAN", "PENDAPATAN");
  const coaHutang = await getCoaMappingDetail("PENDAPATAN", "HUTANG");
  const coaPiutang = await getCoaMappingDetail("PENDAPATAN", "PIUTANG");

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit: number = total + pph23;
  const totalKredit: number = nominal + ppn;

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance (pendapatan pajak full)");
  }

  /* =========================
     LINES
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaKas.id_coa,
      debit: total,
      kredit: 0,
    },
    {
      id_coa: coaPiutang.id_coa,
      debit: pph23,
      kredit: 0,
    },
    {
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: nominal,
    },
    {
      id_coa: coaHutang.id_coa,
      debit: 0,
      kredit: ppn,
    },
  ];

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PENDAPATAN",
    lines,
  });
}