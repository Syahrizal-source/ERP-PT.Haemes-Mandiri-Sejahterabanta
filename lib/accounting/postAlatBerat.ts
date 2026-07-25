import { postJournal } from "./postJournal";
import { JurnalLine } from "@/types/accounting";

export async function postAlatBerat(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  lines: JurnalLine[],
): Promise<number> {
  const jurnalId: number = await postJournal({
    tanggal: tanggal,
    no_bukti: no_bukti,
    keterangan: keterangan,
    sumber: "ALAT_BERAT",
    lines: lines,
  });

  return jurnalId;
}
