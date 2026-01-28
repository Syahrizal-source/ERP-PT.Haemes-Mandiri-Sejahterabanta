export type ModulUsaha = "ARMADA" | "ALAT_BERAT" | "PROYEK" | "KEBUN";
export type KategoriCOA = "KAS" | "PENDAPATAN" | "BEBAN";

export interface COAMappingRow {
  id: number;
  modul: ModulUsaha;
  kategori: KategoriCOA;
  id_coa: number;
  created_at: string;
}
