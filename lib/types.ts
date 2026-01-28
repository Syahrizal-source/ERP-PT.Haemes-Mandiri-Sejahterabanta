import { RowDataPacket } from "mysql2";
/* ========================= USER ========================= */
export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  role_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/* ========================= HM ALAT ========================= */
export interface HmAlat extends RowDataPacket {
  id: number;
  id_alat: string;
  kode_unit: string;
  jenis_alat: string;
  merek: string;
  model: string;
  bucket_capacity: number;
  standard_fuel_rate_created_at: string;
}

/* ========================= HM COST ========================= */
export interface HmCost extends RowDataPacket {
  id: number;
  id_alat: string;
  tanggal: string;
  biaya_bbm: number;
  biaya_operator: number;
  biaya_maintenance: number;
  total_cost: number;
  cost_per_hour: number;
  cost_per_bcm: number;
}

/* ========================= HM FUEL ========================= */
export interface HmFuel extends RowDataPacket {
  id: number;
  id_alat: string;
  tanggal: string;
  fuel_used: number;
  fuel_rate_actual: number;
  fuel_index: number;
}

/* ========================= HM PRODUCTION ========================= */
export interface HmProduction extends RowDataPacket {
  id: number;
  id_alat: string;
  tanggal: string;
  cycle_per_hour: number;
  fill_factor: number;
  total_production: number;
  productivity: number;
}

/* ========================= HM TIME LOG ========================= */
export interface HmTimeLog extends RowDataPacket {
  id: number;
  id_alat: string;
  tanggal: string;
  scheduled_time: number;
  breakdown_time: number;
  working_time: number;
  hm_awal: number;
  hm_akhir: number;
  hm_selisih: number;
  available_time: number;
}

export interface PPh21Row extends RowDataPacket {
  id: number;
  id_karyawan: number;
  gaji_bruto: number;
  tunjangan: number;
  potongan: number;
  penghasilan_kena_pajak: number;
  pph_terutang: number;
  periode: string;
}
