export type UUID = string;

export type StatusPosting = "DRAFT" | "POSTED";

export type MetodePembayaran =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

export type MetodePembayaranMaterial = MetodePembayaran;
export type MetodePembayaranRealisasi = MetodePembayaran;
export type MetodePembayaranTenagaKerja = MetodePembayaran;

export type JenisProyek =
  | "PENGURUGAN"
  | "CUT_FILL"
  | "LAND_CLEARING"
  | "JALAN"
  | "DRAINASE"
  | "APARTEMEN"
  | "GEDUNG"
  | "PERUMAHAN";

export type StatusProyek =
  | "DRAFT"
  | "OPEN"
  | "BERJALAN"
  | "SELESAI"
  | "DITUTUP"
  | "BATAL";

export type MetodeKontrak = "LUMPSUM" | "UNIT_PRICE";

export type ProyekMaster = {
  id: UUID;
  kode_proyek: string;
  nama_proyek: string;
  kode_accounting_proyek: string | null;
  lokasi?: string | null;
  customer: string;
  jenis_proyek: JenisProyek;
  nilai_kontrak: number;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  project_manager: string;
  status: StatusProyek;
  margin_target?: number | null;
  metode_kontrak: MetodeKontrak;
  created_at?: string;
  updated_at?: string;
};

export type ProyekRAB = {
  id: UUID;
  id_proyek: UUID;
  id_kategori: number;
  uraian: string;
  volume: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  keterangan?: string;
  kategori?: KategoriBiayaProyek;
  created_at: string;
  updated_at: string;
};

export type ProyekRAP = {
  id: UUID;
  id_rab: UUID;
  id_proyek: UUID;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan?: string | null;
  harga: number;
  total: number;
  tanggal: string;
  keterangan?: string | null;
  kategori?: KategoriBiayaProyek;
  created_at?: string;
  updated_at?: string;
};

export type ProyekRealisasi = {
  id: UUID;
  id_proyek: UUID;
  id_rab: UUID;
  id_rap: UUID;
  id_kategori: number;
  tanggal: string;
  no_bukti: string;
  uraian: string;
  qty: number;
  satuan?: string | null;
  harga: number;
  total: number;
  metode_pembayaran: MetodePembayaranRealisasi;
  keterangan?: string | null;
  id_jurnal?: number | null;
  created_by?: UUID | null;
  created_at?: string;
  updated_at?: string;
};

export type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
  created_at: string;
};

export type ProyekCostControl = {
  id_proyek: UUID;
  kode_proyek: string;
  nama_proyek: string;
  id_kategori: number;
  kategori_kode: string;
  kategori_biaya: string;
  rab: number;
  rap: number;
  realisasi: number;
  sisa_rab: number;
  sisa_rap: number;
  progress: number;
};

export type StatusProgress =
  | "ON_PROGRESS"
  | "SELESAI"
  | "TERLAMBAT"
  | "DIBATALKAN";

export type ProyekProgress = {
  id: UUID;
  id_proyek: UUID;
  no_bukti: string;
  tanggal: string;
  target_volume: number;
  realisasi_volume: number;
  satuan: "m3" | "m2" | "km" | "ton" | "unit" | "ha";
  nilai_progress: number;
  metode_pembayaran: MetodePembayaran;
  status: StatusProgress;
  periode?: string | null;
  lokasi?: string | null;
  pic?: string | null;
  id_jurnal?: number | null;
  created_by?: UUID | null;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StatusProyekAlatBerat = "AKTIF" | "SELESAI" | "DIBATALKAN";
export type ProyekAlatBerat = {
  id: UUID;
  id_proyek: UUID;
  id_alat: string;
  id_kategori: number;
  no_bukti: string;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  tarif_sewa_internal: number;
  jam_operasi: number;
  metode_pembayaran: MetodePembayaran;
  periode?: string | null;
  status: StatusProyekAlatBerat;
  id_jurnal?: number | null;
  created_by?: UUID | null;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type TipeTenagaKerja =
  | "MANAJEMEN_PROYEK"
  | "TENAGA_AHLI"
  | "TEKNISI_ANALIS"
  | "OPERATOR_ALAT_BERAT"
  | "OPERATOR_ANGKUTAN"
  | "PEKERJA_LAPANGAN"
  | "ADMINISTRASI";
export type StatusTenagaKerja = "AKTIF" | "SELESAI" | "DIBATALKAN";
export type ProyekTenagaKerja = {
  id: UUID;
  id_proyek: UUID;
  nama: string;
  jabatan?: string | null;
  tipe: TipeTenagaKerja;
  upah: number;
  periode?: string | null;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  status: StatusTenagaKerja;
  no_bukti?: string | null;
  metode_pembayaran?: MetodePembayaran;
  id_jurnal?: number | null;
  keterangan?: string | null;
  status_posting?: StatusPosting;
  created_at?: string;
  updated_at?: string;
};
export type StatusTagihanProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";
export type ProyekTagihan = {
  id: UUID;
  id_proyek: UUID;
  nomor_invoice: string;
  tanggal: string;
  nilai: number;
  status: StatusTagihanProyek;
  no_bukti?: string | null;
  periode?: string | null;
  id_jurnal?: number | null;
  total_material: number;
  total_alat_berat: number;
  total_tenaga_kerja: number;
  total_operasional: number;
  total_realisasi: number;
  total_subkon: number;
  total_progress: number;
  nilai_ppn: number;
  nilai_pph: number;
  grand_total: number;
  created_by?: UUID | null;
  created_at?: string;
  updated_at?: string;
};
export type SumberTagihanDetail =
  | "MATERIAL"
  | "ALAT_BERAT"
  | "TENAGA_KERJA"
  | "OPERASIONAL"
  | "REALISASI"
  | "SUBKON"
  | "PROGRESS";
export type ProyekTagihanDetail = {
  id: UUID;
  id_tagihan: UUID;
  sumber: SumberTagihanDetail;
  id_referensi: UUID;
  no_bukti?: string | null;
  uraian?: string | null;
  qty?: number | null;
  satuan?: string | null;
  harga?: number | null;
  total?: number | null;
  id_jurnal?: number | null;
  created_at?: string;
};
export type ProyekTagihanSummary = {
  total_material: number;
  total_alat_berat: number;
  total_tenaga_kerja: number;
  total_operasional: number;
  total_realisasi: number;
  total_subkon: number;
  total_progress: number;
  nilai_ppn: number;
  nilai_pph: number;
  grand_total: number;
};

export type MetodePenerimaanProyek = "KAS" | "KAS_BESAR" | "KAS_KECIL" | "BANK";
export type ProyekPenerimaan = {
  id: UUID;
  id_tagihan: UUID;
  tanggal: string;
  jumlah: number;
  metode: MetodePenerimaanProyek;
  bank?: string | null;
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
  customer?: string | null;
  nilai: number;
  sisa: number;
  jatuh_tempo?: string | null;
};

/* =========================
   PIUTANG PROYEK ACCOUNTING
========================= */

export type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export type PiutangProyekAccounting = {
  id_piutang_proyek: number;
  id_proyek: string;
  id_tagihan: UUID;
  tanggal: string;
  customer: string;
  tanggal_pembayaran?: string | null;
  nilai_piutang: number;
  penerimaan: number;
  saldo: number;
  keterangan?: string | null;
  status: StatusPiutangProyek;
  id_jurnal: number | null;
  is_posted: boolean;
  created_at?: string;
  updated_at?: string;
};
export type ProyekMaterial = {
  id: UUID;
  id_proyek: UUID;
  id_kategori: number;
  tanggal: string;
  no_bukti?: string | null;
  qty: number;
  satuan: string;
  harga: number;
  total: number;
  metode_pembayaran: MetodePembayaranMaterial;
  gudang?: string | null;
  supplier?: string | null;
  keterangan?: string | null;
  id_jurnal?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type StatusOperasional = "DRAFT" | "POSTED" | "DIBATALKAN";
export type ProyekOperasional = {
  id: UUID;
  id_proyek: UUID;
  id_kategori: number;
  no_bukti: string;
  tanggal: string;
  uraian: string;
  qty: number;
  satuan?: string | null;
  harga: number;
  total: number;
  supplier?: string | null;
  metode_pembayaran: MetodePembayaran;
  periode?: string | null;
  status: StatusOperasional;
  id_jurnal?: number | null;
  created_by?: UUID | null;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type StatusSubkon = "AKTIF" | "SELESAI" | "DIBATALKAN";
export type ProyekSubkon = {
  id: UUID;
  id_proyek: UUID;
  id_kategori: number;
  no_bukti: string;
  tanggal: string;
  nama_vendor: string;
  pekerjaan: string;
  nilai_kontrak: number;
  metode_pembayaran: MetodePembayaran;
  periode?: string | null;
  status: StatusSubkon;
  id_jurnal?: number | null;
  created_by?: UUID | null;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
};
