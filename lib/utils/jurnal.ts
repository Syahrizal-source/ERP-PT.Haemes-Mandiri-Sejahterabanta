export interface JurnalBalanceRow {
  debit: number;
  kredit: number;
}

export function validateBalance(details: JurnalBalanceRow[]): void {
  const totalDebit = details.reduce((s, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Total Debit harus sama dengan Total Kredit");
  }
}
