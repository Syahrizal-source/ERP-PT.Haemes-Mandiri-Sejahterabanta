import { JurnalDetail } from "@/types/jurnal";

export function validateDebitKredit(details: JurnalDetail[]): void {
  const totalDebit = details.reduce((sum, d) => sum + d.debit, 0);
  const totalKredit = details.reduce((sum, d) => sum + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Total debit dan kredit tidak seimbang");
  }
}
