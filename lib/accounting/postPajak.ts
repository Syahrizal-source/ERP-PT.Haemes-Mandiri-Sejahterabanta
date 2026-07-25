import { postJournal } from "./postJournal";
import { JurnalLine } from "@/types/accounting";

export async function postPajak(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  ref_id: string,
  lines: JurnalLine[],
): Promise<number> {
  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PAJAK",
    ref_id,
    lines,
  });
}
