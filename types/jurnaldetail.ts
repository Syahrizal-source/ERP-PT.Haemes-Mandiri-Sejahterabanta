export interface JurnalDetailRow {
  id_detail: number;
  id_jurnal: number;
  id_coa: number;
  debit: number;
  kredit: number;
  id_alat: number | null;
  id_cost_center: number | null;
}
