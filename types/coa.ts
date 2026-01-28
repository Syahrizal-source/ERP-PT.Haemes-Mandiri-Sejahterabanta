export type CoaTipe =
  | "ASET"
  | "LIABILITAS"
  | "EKUITAS"
  | "PENDAPATAN"
  | "BEBAN";

export interface Coa {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: CoaTipe;

  parent_id: number | null;

  aktif: boolean;
  is_cash: boolean;

  created_at: string;
  updated_at: string | null;
}
