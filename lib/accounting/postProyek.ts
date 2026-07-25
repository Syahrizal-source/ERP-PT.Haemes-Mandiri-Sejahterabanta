import { postJournal } from "./postJournal";
import { JurnalLine } from "@/types/accounting";

export async function postProyek(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  id_proyek: string,
  lines: JurnalLine[],
): Promise<number> {
  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PROYEK",
    id_proyek,
    lines,
  });
}
