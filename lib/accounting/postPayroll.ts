import { postJournal } from "./postJournal";
import { JurnalLine } from "@/types/accounting";

export async function postPayroll(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  lines: JurnalLine[],
): Promise<number> {
  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PAYROLL",
    lines,
  });
}
