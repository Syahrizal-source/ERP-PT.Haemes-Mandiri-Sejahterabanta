export type UUID = string;

export type ProyekMaster = {
  id: UUID;
  kode_proyek: string;
  nama_proyek: string;
  lokasi?: string;
  customer: string;
  jenis_proyek: "earthwork" | "hauling" | "mining" | "konstruksi" | "lainnya";
  nilai_kontrak: number;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  project_manager: string;
  status: "draft" | "running" | "closed";
  margin_target?: number;
  metode_kontrak: "lumpsum" | "unit_price";
};

export type ProyekRAB = {
  id: UUID;
  id_proyek: UUID;
  kategori:
    | "alat"
    | "tenaga_kerja"
    | "bbm"
    | "sparepart"
    | "subcontract"
    | "overhead";
  uraian?: string;
  volume: number;
  satuan?: string;
  harga_satuan: number;
};

export type ProyekCostControl = {
  id: UUID;
  id_rab: UUID;
  tanggal: string;
  biaya_realisasi: number;
  keterangan?: string;
  sumber: "invoice" | "kas" | "hutang";
};

export type ProyekProgress = {
  id: UUID;
  id_proyek: UUID;
  tanggal: string;
  target_volume: number;
  realisasi_volume: number;
  keterangan?: string;
};

export type ProyekAlatBerat = {
  id: UUID;
  id_proyek: UUID;
  id_armada: UUID;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  tarif_sewa_internal: number;
  jam_operasi: number;
  status?: string;
};

export type ProyekTenagaKerja = {
  id: UUID;
  id_proyek: UUID;
  nama: string;
  jabatan?: string;
  tipe: "harian" | "borongan" | "staff";
  upah: number;
  periode?: string;
};

export type ProyekTagihan = {
  id: UUID;
  id_proyek: UUID;
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  status: "open" | "partial" | "paid";
};

export type ProyekPenerimaan = {
  id: UUID;
  id_tagihan: UUID;
  tanggal: string;
  jumlah: number;
  metode?: string;
  bank?: string;
};

export type ProyekHutang = {
  id: UUID;
  id_proyek: UUID;
  supplier?: string;
  tanggal?: string;
  nilai: number;
  jatuh_tempo?: string;
  status?: string;
};

export type ProyekPiutang = {
  id: UUID;
  id_tagihan: UUID;
  customer?: string;
  nilai: number;
  sisa: number;
  jatuh_tempo?: string;
};

export type ProyekMaterial = {
  id: UUID;
  id_proyek: UUID;
  material?: string;
  qty: number;
  harga: number;
  gudang?: string;
};
