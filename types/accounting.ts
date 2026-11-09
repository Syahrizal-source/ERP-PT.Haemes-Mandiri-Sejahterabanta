/**
 * ============================================================
 * JENIS TRANSAKSI ALAT BERAT
 * ============================================================
 */

export type JenisTransaksiAlatBerat =
  | "FUEL"
  | "MAINTENANCE"
  | "RENTAL"
  | "DEPRECIATION";

/**
 * ============================================================
 * JENIS TRANSAKSI PURCHASING
 * ============================================================
 */

export type JenisTransaksiPurchasing = "ORDER" | "RECEIPT" | "PAYMENT";

/**
 * ============================================================
 * JENIS TRANSAKSI PAJAK
 * ============================================================
 */

export type JenisTransaksiPajak = "PPH21" | "PPH23" | "PPH4" | "PPH25" | "PPN";

/**
 * ============================================================
 * JENIS TRANSAKSI PEMBAYARAN PPH4 AYAT (2)
 * ============================================================
 *
 * Pembayaran PPh4 adalah pelunasan kewajiban pajak yang
 * sebelumnya telah tercatat sebagai:
 *
 *   21304 - Hutang Pajak PPh4
 *
 * Pada saat pembayaran:
 *
 *   DEBIT  : 21304 - Hutang Pajak PPh4
 *   KREDIT : COA Kas/Bank DETAIL aktual
 *
 * Tidak menggunakan:
 *   62003 - Beban Pajak PPh4
 *
 * Tidak menggunakan:
 *   21300 - Utang Pajak (HEADER)
 *
 * Tidak menggunakan:
 *   COA Kas/Bank HEADER.
 */
export type JenisTransaksiPembayaranPph4 = "PEMBAYARAN";

/**
 * ============================================================
 * JENIS TRANSAKSI PEMBAYARAN PPN
 * ============================================================
 *
 * Pembayaran PPN adalah pelunasan kewajiban PPN.
 *
 * COA yang digunakan berdasarkan database saat ini:
 *
 *   PPN / HUTANG
 *       → id_coa 53
 *       → 21301 Hutang Pajak PPN
 *
 * COA 53 adalah:
 *
 *   tipe            = LIABILITAS
 *   aktif           = true
 *   is_header       = false
 *   is_cash         = false
 *   normal_balance  = KREDIT
 *
 * Pada saat pembayaran:
 *
 *   DEBIT  : 53 - 21301 Hutang Pajak PPN
 *   KREDIT : COA Kas/Bank DETAIL aktual
 *
 * COA kas/bank tidak diambil dari:
 *
 *   PPN / KAS → id_coa 3
 *
 * karena:
 *
 *   3 - 11100 Kas
 *   adalah HEADER
 *
 * COA kas/bank aktual harus berasal dari COA DETAIL yang
 * dipilih pada pembayaran dan divalidasi oleh backend.
 *
 * Tidak menggunakan:
 *
 *   2380 - 12020 PPN Masukan
 *
 * untuk pelunasan hutang PPN.
 *
 * Tidak menggunakan:
 *
 *   2266 - 62004 Beban Pajak PPN
 *
 * sebagai akun pembayaran.
 *
 * Tidak menggunakan:
 *
 *   1210 - 21306 Hutang PPN Proyek
 *
 * karena akun tersebut khusus transaksi Proyek dan sudah
 * memiliki histori jurnal.
 */
export type JenisTransaksiPembayaranPpn = "PEMBAYARAN";

/**
 * ============================================================
 * JENIS TRANSAKSI PEMBAYARAN PPH23
 * ============================================================
 *
 * Pembayaran PPh23 adalah pelunasan kewajiban pajak PPh23
 * yang sebelumnya telah tercatat sebagai:
 *
 *   21303 - Hutang Pajak PPh 23
 *   id_coa = 55
 *
 * Pada saat pembayaran:
 *
 *   DEBIT
 *       55 - 21303 - Hutang Pajak PPh 23
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual yang dipilih user
 *
 * COA pembayaran ditentukan oleh backend melalui:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PAJAK_PPH23 / HUTANG
 *       -> id_coa 55
 *       -> 21303 Hutang Pajak PPh 23
 *
 *   PAJAK_PPH23 / KAS
 *       -> id_coa 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * Mapping PAJAK_PPH23 / KAS tidak digunakan langsung
 * sebagai COA jurnal pembayaran karena id_coa 3 adalah HEADER.
 *
 * COA kas/bank aktual berasal dari id_coa_kas yang dipilih
 * user dan divalidasi oleh backend.
 *
 * Tidak menggunakan:
 *
 *   2264 - 62002 Beban Pajak PPh23
 *
 * karena 2264 adalah akun BEBAN, bukan akun pelunasan hutang.
 *
 * Tidak menggunakan:
 *
 *   1213 - 21308 Hutang PPh23 Proyek
 *
 * karena akun tersebut khusus transaksi Proyek.
 *
 * Tidak menggunakan:
 *
 *   3 - 11100 Kas
 *
 * karena merupakan COA HEADER.
 *
 * Tidak menggunakan:
 *
 *   2722 - 21300 Utang Pajak
 *
 * karena merupakan COA HEADER.
 *
 * Tidak ada pajak tambahan pada proses pembayaran.
 * Tidak ada PPN.
 * Tidak ada PPh4.
 */
export type JenisTransaksiPembayaranPph23 = "PEMBAYARAN";

/**
 * ============================================================
 * JENIS TRANSAKSI PEMBAYARAN PPH21
 * ============================================================
 *
 * Pembayaran PPh21 adalah pelunasan kewajiban pajak PPh21
 * yang sebelumnya telah tercatat sebagai:
 *
 *   21302 - Hutang Pajak PPh 21
 *   id_coa = 54
 *
 * Pada saat pembayaran:
 *
 *   DEBIT
 *       54 - 21302 - Hutang Pajak PPh 21
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual yang dipilih user
 *
 * COA pembayaran ditentukan oleh backend melalui:
 *
 *   public.coa_mapping
 *
 * Mapping hutang PPh21:
 *
 *   PAJAK / HUTANG
 *       -> id_coa 54
 *       -> 21302 Hutang Pajak PPh 21
 *
 * Mapping PAJAK / KAS yang menggunakan:
 *
 *   id_coa 3
 *   11100 Kas
 *
 * tidak digunakan langsung sebagai COA jurnal pembayaran
 * karena id_coa 3 adalah COA HEADER.
 *
 * COA kas/bank aktual berasal dari id_coa_kas yang dipilih
 * user dan harus divalidasi oleh backend sebagai COA DETAIL.
 *
 * Tidak menggunakan:
 *
 *   2263 - 62001 Beban Pajak PPh21
 *
 * karena 2263 adalah akun BEBAN, bukan akun pelunasan hutang.
 *
 * Tidak menggunakan:
 *
 *   1212 - 21307 Hutang PPh21 Proyek
 *
 * karena akun tersebut khusus transaksi Proyek.
 *
 * Tidak menggunakan:
 *
 *   3 - 11100 Kas
 *
 * karena merupakan COA HEADER.
 *
 * Tidak menggunakan:
 *
 *   2722 - 21300 Utang Pajak
 *
 * karena merupakan COA HEADER.
 *
 * Tidak ada pajak tambahan pada proses pembayaran.
 * Tidak ada PPN.
 * Tidak ada PPh23.
 * Tidak ada PPh4.
 */
export type JenisTransaksiPembayaranPph21 = "PEMBAYARAN";

/**
 * ============================================================
 * JENIS TRANSAKSI PROYEK
 * ============================================================
 *
 * CASH:
 *   Pembayaran langsung oleh customer.
 *
 * TERMIN:
 *   Pendapatan berdasarkan invoice/termin.
 *
 * UANG_MUKA:
 *   Penerimaan uang muka sebelum pekerjaan dimulai.
 *
 * PELUNASAN:
 *   Pelunasan piutang/termin oleh customer.
 */

export type JenisTransaksiProyek =
  | "CASH"
  | "TERMIN"
  | "UANG_MUKA"
  | "PELUNASAN";

/**
 * ============================================================
 * JENIS TRANSAKSI PENDAPATAN
 * ============================================================
 */

export type JenisTransaksiPendapatanProyek =
  | "CASH"
  | "TERMIN"
  | "UANG_MUKA"
  | "PELUNASAN";

/**
 * ============================================================
 * JENIS TRANSAKSI INVOICE
 * ============================================================
 *
 * INVOICE:
 *   Pengakuan piutang dan pendapatan
 *   saat invoice diterbitkan.
 *
 * PEMBAYARAN:
 *   Penerimaan pembayaran invoice
 *   dan pengurangan piutang.
 */

export type JenisTransaksiInvoice = "INVOICE" | "PEMBAYARAN";

/**
 * ============================================================
 * STATUS INVOICE
 * ============================================================
 *
 * Harus mengikuti CHECK constraint:
 *
 *   Unpaid (Menunggu Pembayaran)
 *   Partial (Pembayaran Sebagian)
 *   Paid (Pembayaran Penuh/ Lunas)
 */

export type StatusInvoice =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

/**
 * ============================================================
 * INVOICE
 * ============================================================
 *
 * Relasi utama:
 *
 *   invoice.id_proyek
 *          ↓
 *   proyek_master.id
 *
 * Customer TIDAK menjadi relasi utama.
 *
 * Customer diperoleh dari:
 *
 *   proyek_master.id_vendor
 *          ↓
 *   vendors.id
 *          ↓
 *   vendors.nama_vendor
 *
 * Nilai kontrak berasal dari proyek dan dapat disimpan
 * sebagai snapshot pada invoice.
 *
 * Perhitungan invoice:
 *
 *   nilai_kontrak
 *        ↓
 *   persentase_termin
 *        ↓
 *   nilai_tagihan_termin
 *        ↓
 *   potongan_uang_muka
 *   potongan_retensi
 *        ↓
 *   subtotal_tagihan
 *        ↓
 *   ppn_nilai
 *        ↓
 *   total_neto
 */

export interface Invoice {
  id: number;

  tanggal: string;
  no_invoice: string;

  /**
   * Customer tetap tersedia sebagai snapshot/kompatibilitas
   * dengan struktur invoice lama.
   *
   * Sumber customer sebenarnya:
   * proyek_master -> vendors.nama_vendor
   */
  customer: string;

  /**
   * Nilai invoice lama.
   *
   * Tetap dipertahankan karena kolom ini masih ada di database
   * dan mungkin masih digunakan oleh kode lama.
   *
   * Jangan dijadikan sumber perhitungan invoice baru.
   */
  nominal: number;

  status: StatusInvoice;

  created_at: string;

  tanggal_jatuh_tempo: string | null;
  is_reminded: boolean;

  /**
   * ==========================================================
   * RELASI PROYEK
   * ==========================================================
   *
   * PostgreSQL:
   *   invoice.id_proyek -> proyek_master.id
   *
   * Keduanya bertipe UUID.
   */
  id_proyek: string | null;

  /**
   * Snapshot nilai kontrak proyek pada saat invoice dibuat.
   */
  nilai_kontrak: number | null;

  /**
   * Persentase termin.
   *
   * Range database:
   *   > 0 dan <= 100
   */
  persentase_termin: number | null;

  /**
   * Nilai tagihan termin sebelum potongan.
   */
  nilai_tagihan_termin: number | null;

  /**
   * Potongan uang muka.
   */
  potongan_uang_muka: number;

  /**
   * Persentase retensi.
   */
  retensi_persen: number | null;

  /**
   * Nilai potongan retensi.
   */
  potongan_retensi: number;

  /**
   * Nilai setelah termin dikurangi uang muka
   * dan retensi.
   */
  subtotal_tagihan: number | null;

  /**
   * Persentase PPN.
   */
  ppn_persen: number | null;

  /**
   * Nilai PPN.
   */
  ppn_nilai: number | null;

  /**
   * Total netto invoice.
   */
  total_neto: number | null;
}

/**
 * ============================================================
 * INVOICE DENGAN INFORMASI PROYEK
 * ============================================================
 *
 * Digunakan untuk GET/list/detail invoice.
 *
 * Data Customer tidak diambil dari input invoice,
 * tetapi berasal dari relasi Proyek -> Vendor.
 */

export interface InvoiceProjectInfo {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  nilai_kontrak: number;
  id_vendor: number | null;
}

/**
 * ============================================================
 * INVOICE DENGAN CUSTOMER
 * ============================================================
 *
 * Bentuk response API Invoice yang sudah membawa
 * informasi proyek dan Vendor.
 */

export interface InvoiceDetail extends Invoice {
  proyek: InvoiceProjectInfo | null;

  vendor: VendorItem | null;
}

/**
 * ============================================================
 * INPUT CREATE INVOICE
 * ============================================================
 *
 * Yang dikirim UI:
 *
 *   - tanggal
 *   - no_invoice
 *   - id_proyek
 *   - persentase_termin
 *   - potongan_uang_muka
 *   - retensi_persen
 *   - ppn_persen
 *   - status
 *   - tanggal_jatuh_tempo
 *
 * Yang TIDAK dikirim sebagai sumber utama:
 *
 *   customer
 *   nilai_kontrak
 *   nilai_tagihan_termin
 *   potongan_retensi
 *   subtotal_tagihan
 *   ppn_nilai
 *   total_neto
 *
 * Field tersebut diambil/dihitung backend.
 */

export interface InvoiceCreateInput {
  tanggal: string;
  no_invoice: string;

  /**
   * UUID proyek.
   */
  id_proyek: string;

  persentase_termin: number;

  potongan_uang_muka: number;

  retensi_persen: number;

  ppn_persen: number;

  status: StatusInvoice;

  tanggal_jatuh_tempo?: string | null;
}

/**
 * ============================================================
 * INPUT PEMBAYARAN INVOICE
 * ============================================================
 *
 * Ini hanya mendefinisikan jenis transaksi pembayaran.
 *
 * COA pembayaran TIDAK diletakkan di type Invoice.
 *
 * COA aktual harus ditentukan oleh logic accounting
 * dan mapping yang sudah ada.
 */

export interface InvoicePaymentInput {
  /**
   * ID invoice dari public.invoice.
   */
  id_invoice: number;

  /**
   * Tanggal penerimaan pembayaran.
   */
  tanggal: string;

  /**
   * Nilai pembayaran sebelum komponen pajak pembayaran.
   *
   * Nilai ini harus divalidasi backend terhadap
   * sisa tagihan invoice.
   */
  nominal: number;

  /**
   * PPN yang terkait dengan transaksi pembayaran,
   * jika memang ada.
   *
   * Default database = 0.
   */
  ppn?: number;

  /**
   * PPh23 yang terkait dengan transaksi pembayaran,
   * jika memang ada.
   *
   * Default database = 0.
   */
  pph23?: number;

  /**
   * Total pembayaran yang dicatat.
   *
   * Nilai final tetap dihitung/divalidasi backend.
   */
  total?: number;

  /**
   * COA Bank/Kas DETAIL aktual yang menerima pembayaran.
   *
   * Contoh:
   *
   *   166 = BNI - 12965308
   *   167 = DANAMON
   *   168 = MANDIRI
   *   169 = ARTHA GRAHA
   *   170 = BNI - 1918768145
   *
   * Backend wajib memvalidasi:
   *   - COA aktif
   *   - bukan header
   *   - merupakan akun kas/bank yang valid
   */
  id_coa_debit: number;

  /**
   * Keterangan pembayaran.
   */
  keterangan: string;
}

/**
 * ============================================================
 * COA REKENING PEMBAYARAN INVOICE
 * ============================================================
 *
 * Digunakan untuk dropdown Bank/Kas pada form
 * Pembayaran Invoice.
 *
 * Hanya COA DETAIL yang boleh digunakan sebagai
 * rekening penerimaan.
 */
export interface InvoicePaymentCoa {
  id_coa: number;
  kode: string;
  nama: string;
}

/**
 * ============================================================
 * INFORMASI SALDO INVOICE UNTUK PEMBAYARAN
 * ============================================================
 *
 * Sumber utama:
 *   public.v_invoice_saldo
 *
 * Digunakan sebelum pembayaran dibuat.
 */
export interface InvoicePaymentInvoiceInfo {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;

  id_proyek: string | null;

  nilai_kontrak: number | null;
  persentase_termin: number | null;
  nilai_tagihan_termin: number | null;

  potongan_uang_muka: number;
  retensi_persen: number | null;
  potongan_retensi: number;

  subtotal_tagihan: number | null;

  ppn_persen: number | null;
  ppn_nilai: number | null;

  total_neto: number | null;

  /**
   * Nilai tagihan efektif.
   *
   * Untuk invoice baru:
   *   total_neto
   *
   * Untuk invoice legacy:
   *   nominal
   */
  nilai_tagihan: number;

  /**
   * Total pembayaran yang sudah diterima.
   */
  total_dibayar: number;

  /**
   * Sisa yang masih boleh dibayar.
   */
  sisa_tagihan: number;

  /**
   * Jumlah transaksi pembayaran.
   */
  jumlah_pembayaran: number;

  status: StatusInvoice;
  tanggal_jatuh_tempo: string | null;
}

/**
 * ============================================================
 * DETAIL PEMBAYARAN INVOICE
 * ============================================================
 *
 * Digunakan untuk GET/list/detail transaksi pembayaran.
 */
export interface InvoicePaymentDetail {
  id: number;
  tanggal: string;

  id_invoice: number;

  nominal: number;
  ppn: number;
  pph23: number;
  total: number;

  keterangan: string;

  id_coa_debit: number | null;
  id_jurnal: number | null;

  created_at: string;

  invoice: InvoicePaymentInvoiceInfo | null;

  coa_debit: InvoicePaymentCoa | null;
}

/**
 * ============================================================
 * JENIS TRANSAKSI VENDOR
 * ============================================================
 *
 * HUTANG:
 *   Pengakuan hutang kepada vendor.
 *
 * PEMBAYARAN:
 *   Pembayaran hutang vendor
 *   dan pengurangan hutang.
 *
 * KOREKSI:
 *   Koreksi transaksi hutang vendor.
 */

export type JenisTransaksiVendor = "HUTANG" | "PEMBAYARAN" | "KOREKSI";

export type StatusPembayaranHutang = "DRAFT" | "POSTED" | "CANCELLED";

export type MetodePembayaranHutang = "KAS" | "BANK";

/**
 * ============================================================
 * JENIS TRANSAKSI KASBON DIREKSI
 * ============================================================
 */

export type JenisTransaksiKasbonDireksi = "KASBON" | "PENGEMBALIAN" | "KOREKSI";

/**
 * ============================================================
 * JENIS TRANSAKSI KASBON PRIBADI
 * ============================================================
 */

export type JenisTransaksiKasbonPribadi = "KASBON" | "PENGEMBALIAN" | "KOREKSI";

/**
 * ============================================================
 * JENIS TRANSAKSI ARMADA
 * ============================================================
 *
 * TAGIHAN:
 *   Pengakuan biaya Armada sekaligus hutang Armada.
 *
 * PEMBAYARAN:
 *   Pembayaran hutang/tagihan Armada.
 *
 * KOREKSI:
 *   Koreksi transaksi tagihan/pembayaran Armada.
 */

export type JenisTransaksiArmada = "TAGIHAN" | "PEMBAYARAN" | "KOREKSI";

/**
 * ============================================================
 * STATUS TRANSAKSI PEMBAYARAN TAGIHAN ARMADA
 * ============================================================
 */

export type StatusPembayaranTagihanArmada = "DRAFT" | "POSTED" | "CANCELLED";

/**
 * ============================================================
 * METODE PEMBAYARAN TAGIHAN ARMADA
 * ============================================================
 *
 * Nilai ini menggambarkan media pembayaran.
 * COA aktual tetap ditentukan dari id_coa_kas.
 */

export type MetodePembayaranArmada = "KAS" | "BANK";

/**
 * ============================================================
 * JENIS TRANSAKSI REKENING KORAN
 * ============================================================
 *
 * Rekening Koran tidak menggunakan satu COA bank tetap.
 *
 * COA bank aktual ditentukan berdasarkan rekening bank
 * yang digunakan pada transaksi/rekening koran.
 *
 * Mapping existing:
 *
 *   REKENING_KORAN / BANK
 *       → id_coa 4
 *       → Header Bank
 *
 *   REKENING_KORAN / BIAYA
 *       → id_coa 2509
 *       → 62010 Biaya Administrasi Bank
 *
 *   REKENING_KORAN / PAJAK
 *       → id_coa 2510
 *       → 62011 Pajak Bank
 *
 *   REKENING_KORAN / CLEARING
 *       → id_coa 2512
 *       → 11990 Clearing Bank
 *
 * CATATAN:
 *
 * Mapping BANK id_coa 4 tidak boleh langsung digunakan
 * sebagai id_coa jurnal detail karena merupakan akun
 * header/parent Bank.
 *
 * COA bank aktual harus berasal dari rekening bank
 * yang dipilih.
 */

export type JenisTransaksiRekeningKoran =
  | "MASUK"
  | "KELUAR"
  | "BIAYA_BANK"
  | "PAJAK_BANK";

/**
 * ============================================================
 * MASTER VENDOR
 * ============================================================
 */

export interface VendorItem {
  id: number;
  kode_vendor: string | null;
  nama_vendor: string;
  kategori_vendor: string | null;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  status: boolean;
  created_at: string;
  updated_at: string | null;
  pkp: boolean;
  jenis_pajak: string | null;
  id_coa: number | null;
  kode_coa?: string | null;
  nama_coa?: string | null;
}

/**
 * ============================================================
 * SUMBER JURNAL
 * ============================================================
 */

export type JurnalSumber =
  | "UMUM"
  | "PENYESUAIAN"
  | "PENUTUP"
  | "KOREKSI"
  | "ARMADA"
  | "KAS_ARMADA"
  | "ALAT_BERAT"
  | "PROYEK"
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
  | "PAJAK_PPH21"
  | "PAJAK_PPH23"
  | "PAJAK_PPH4"
  | "PAJAK_PPH25"
  | "PAJAK_PPN"
  | "REKENING_KORAN"
  | "KASBON_DIREKSI"
  | "KASBON_PRIBADI"
  | "HUTANG_LEASING"
  | "HUTANG";

/**
 * ============================================================
 * JURNAL LINE
 * ============================================================
 */

export interface JurnalLine {
  id_coa: number;
  debit: number;
  kredit: number;
  id_vendor?: number | null;
  id_alat?: string | null;
  id_proyek?: string | null;
  id_cost_center?: string | null;
}

/**
 * ============================================================
 * POSISI JURNAL
 * ============================================================
 */

export type PosisiJurnal = "DEBIT" | "KREDIT";

/**
 * ============================================================
 * COA MAPPING
 * ============================================================
 *
 * Database:
 *
 *   modul + kategori → id_coa
 *
 * Tidak ada kolom posisi pada coa_mapping.
 *
 * Posisi DEBIT/KREDIT ditentukan oleh logic transaksi.
 *
 * Untuk ARMADA:
 *
 *   ARMADA / HUTANG
 *       → id_coa 2570
 *       → 21106 Hutang Armada
 *
 *   ARMADA / BEBAN
 *       → id_coa 867
 *       → 61101 Beban Armada
 *
 * Catatan:
 *
 * id_coa 2570 adalah akun hutang detail.
 * id_coa 867 adalah akun beban detail.
 */

export interface CoaMappingDetail {
  id_coa: number;
}

/**
 * ============================================================
 * ACCOUNTING PROYEK
 * ============================================================
 *
 * Relasi COA proyek berasal dari:
 *
 *   public.coa_mapping
 *       modul = 'PROYEK'
 *
 * dan direalisasikan ke:
 *
 *   public.proyek_coa
 *
 * Tidak ada hardcode ID COA proyek di TypeScript.
 */

export interface ProyekCoa {
  id_proyek: string;
  id_coa: number;
  aktif: boolean;
}

export interface ProyekCoaDetail extends ProyekCoa {
  kode_coa: string;
  nama_coa: string;
  tipe_coa: string;
  normal_balance: string | null;
  is_header: boolean;
  is_cash: boolean;
}

export interface ProyekCoaMapping {
  id_coa: number;
  kategori: string;
}

/**
 * ============================================================
 * TRANSAKSI BIAYA UMUM
 * ============================================================
 *
 * Sumber staging:
 *   public.transaksi_biaya_umum
 *
 * Digunakan untuk menyimpan transaksi biaya umum
 * sebelum diposting ke jurnal.
 *
 * COA belum wajib terisi pada saat input awal.
 * Setelah mapping:
 *   id_coa -> public.coa.id_coa
 *
 * Status:
 *   BELUM_MAPPING
 *   SUDAH_MAPPING
 *   DIBATALKAN
 */
export type StatusMappingBiayaUmum =
  | "BELUM_MAPPING"
  | "SUDAH_MAPPING"
  | "DIBATALKAN";

export interface TransaksiBiayaUmum {
  id: number;
  tanggal: string;
  kategori: string;
  keterangan: string;
  nilai: number;
  id_coa: number | null;
  status_mapping: StatusMappingBiayaUmum;
  sumber: "BIAYA_ADM_UMUM";
  created_at: string;
}
