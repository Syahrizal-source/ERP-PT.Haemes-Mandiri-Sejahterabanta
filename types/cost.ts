export type CostCenterType =
  | 'ARMADA'
  | 'ALAT_BERAT'
  | 'PROYEK'
  | 'KEBUN';

export interface CostCenter {
  id_cost_center: number;
  kode: string;
  nama: string;
  tipe: CostCenterType;
  aktif: 0 | 1;
}
