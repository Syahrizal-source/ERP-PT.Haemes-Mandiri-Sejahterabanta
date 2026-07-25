export type JenisTransaksiKebun =
  | "HARVEST"
  | "PEMUPUKAN"
  | "PERAWATAN"
  | "HAMA"
  | "REPLANTING"
  | "GAJI"
  | "MAINTENANCE";

export type JenisTransaksiAlatBerat =
  | "FUEL"
  | "MAINTENANCE"
  | "RENTAL"
  | "DEPRECIATION";

export type JenisTransaksiPurchasing = "ORDER" | "RECEIPT" | "PAYMENT";

/* ===============================
   JENIS TRANSAKSI PAJAK
================================ */

export type JenisTransaksiPajak = "PPH21" | "PPH23" | "PPH4" | "PPH25" | "PPN";

/* ===============================
   SUMBER JURNAL
================================ */

export type JurnalSumber =
  | "UMUM"
  | "PENYESUAIAN"
  | "PENUTUP"
  | "KOREKSI"
  | "ARMADA"
  | "KAS_ARMADA"
  | "ALAT_BERAT"
  | "PROYEK"
  | "KEBUN"
  | "PURCHASING"
  | "PAJAK"
  | "PAYROLL"
  | "PENDAPATAN"
  | "PIUTANG_PROYEK"
  | "KAS_MASUK"
  | "KAS_KELUAR"
  | "PEMBAYARAN_HUTANG"
  | "PINJAMAN"
  | "PEMBAYARAN_INVOICE"
  | "ASET"
  | "AKUMULASI"
  | "PAJAK_PPH23"
  | "PAJAK_PPH4"
  | "PAJAK_PPH25"
  | "PAJAK_PPN"
  | "REKENING_KORAN"
  | "KASBON_DIREKSI"
  | "KASBON_PRIBADI"
  | "HUTANG_LEASING";

export interface JurnalLine {
  id_coa: number;
  debit: number;
  kredit: number;

  id_alat?: string | null;
  id_proyek?: string | null;
  id_cost_center?: string | null;
}

export type PosisiJurnal = "DEBIT" | "KREDIT";

export interface CoaMappingDetail {
  id_coa: number;
  posisi: PosisiJurnal;
}
