import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export type JenisKasbon = "DIREKSI" | "PRIBADI";

export async function postKasbon(
  jenis: JenisKasbon,
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
): Promise<number> {
  const modul = jenis === "DIREKSI" ? "KASBON_DIREKSI" : "KASBON_PRIBADI";

  const piutang = await getCoaMappingDetail(modul, "PIUTANG");

  const kas = await getCoaMappingDetail(modul, "KAS");

  if (nominal <= 0) {
    throw new Error("Nominal kasbon tidak valid");
  }

  const lines: JurnalLine[] = [
    {
      id_coa: piutang.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: kas.id_coa,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal kasbon tidak balance");
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: jenis === "DIREKSI" ? "KASBON_DIREKSI" : "KASBON_PRIBADI",
    modul: "ACCOUNTING",
    lines,
  });
}
