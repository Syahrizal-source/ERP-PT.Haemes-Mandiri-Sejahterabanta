export type QRMeta = {
  laporan: string;
  periode: number;
  generated_at: string;
  checksum: string;
};

export type NeracaRow = {
  kode: string;
  nama: string;
  saldo: number;
};

export type LabaRugiRow = {
  kode: string;
  nama: string;
  nilai: number;
};

export type CashFlowRow = {
  masuk: number;
  keluar: number;
  saldo: number;
};

export type CostControlRow = {
  item: string;
  rab: number;
  realisasi: number;
  selisih: number;
  status: "OK" | "OVER BUDGET";
};
