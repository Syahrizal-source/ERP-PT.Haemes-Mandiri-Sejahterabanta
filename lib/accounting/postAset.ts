import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postAset(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
): Promise<number> {
  const aset = await getCoaMappingDetail("ASET", "ASET");
  const kas = await getCoaMappingDetail("ASET", "KAS");
  const hutang = await getCoaMappingDetail("ASET", "HUTANG");

  const totalAset: number = nominal + ppn;
  const kasKeluar: number = totalAset - pph23;

  if (kasKeluar <= 0) {
    throw new Error("Nilai aset tidak valid");
  }

  const lines: JurnalLine[] = [
    {
      id_coa: aset.id_coa,
      debit: totalAset,
      kredit: 0,
    },
    {
      id_coa: kas.id_coa,
      debit: 0,
      kredit: kasKeluar,
    },
    {
      id_coa: hutang.id_coa,
      debit: 0,
      kredit: pph23,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal aset tidak balance");
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
