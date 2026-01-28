export type HMSDetail = {
  id_coa: number;
  debit: number;
  kredit: number;
  id_alat: number | null;
};

export function normalizeHMSDetails(details: HMSDetail[]): HMSDetail[] {
  return details.map((d) => ({
    id_coa: d.id_coa,
    debit: Math.abs(d.debit),
    kredit: Math.abs(d.kredit),
    id_alat: d.id_alat,
  }));
}
