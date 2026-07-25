import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postDepresiasiAset(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nilai: number,
): Promise<number> {
  const beban = await getCoaMappingDetail("ASET", "BEBAN");
  const akumulasi = await getCoaMappingDetail("ASET", "AKUMULASI");

  if (nilai <= 0) {
    throw new Error("Nilai depresiasi tidak valid");
  }

  const lines: JurnalLine[] = [
    {
      id_coa: beban.id_coa,
      debit: nilai,
      kredit: 0,
    },
    {
      id_coa: akumulasi.id_coa,
      debit: 0,
      kredit: nilai,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal depresiasi tidak balance");
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "ASET",
    modul: "ACCOUNTING",
    lines,
  });
}
