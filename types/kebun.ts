export type JenisTransaksiKebun =
  | "HARVEST"
  | "MAINTENANCE"
  | "PEMUPUKAN"
  | "PERAWATAN"
  | "HAMA"
  | "REPLANTING"
  | "GAJI";

export interface LabaRugiKebunRow {
  id_periode: number;
  region_name: string;
  total_pendapatan: number;
  total_beban: number;
  laba_bersih: number;
}

export interface NeracaKebunRow {
  id_periode: number;
  region_name: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
}

export interface CashFlowKebunRow {
  id_periode: number;
  region_name: string;
  tanggal: string;
  no_bukti: string;
  kas_masuk: number;
  kas_keluar: number;
  net_cash: number;
}

export interface CostControlKebunRow {
  id_periode: number;
  region_name: string;
  total_cost: number;
}
