export function validateDebitKredit(
  details: { debit: number; kredit: number }[]
): void {
  const totalDebit = details.reduce((sum, d) => sum + d.debit, 0);
  const totalKredit = details.reduce((sum, d) => sum + d.kredit, 0);
  if (totalDebit !== totalKredit)
    throw new Error("Debit tidak sama dengan Kredit");
}
