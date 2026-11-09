import { db } from "@/lib/supabase/server";

/**
 * ============================================================
 * MODUL ERP
 * ============================================================
 */

export type ModulERP =
  | "ARMADA"
  | "KAS_ARMADA"
  | "ALAT_BERAT"
  | "PROYEK"
  | "ACCOUNTING"
  | "PAJAK"
  | "PAJAK_PPH23"
  | "PAJAK_PPH4"
  | "PAJAK_PPH25"
  | "PPN"
  | "REKENING_KORAN"
  | "PURCHASING"
  | "PAYROLL"
  | "PENDAPATAN"
  | "PIUTANG_PROYEK"
  | "KAS"
  | "KAS_KELUAR"
  | "PEMBAYARAN_HUTANG"
  | "PINJAMAN"
  | "PEMBAYARAN_INVOICE"
  | "ASET"
  | "KASBON_DIREKSI"
  | "KASBON_PRIBADI"
  | "HUTANG_LEASING"
  | "KOREKSI"
  | "INVOICE"
  | "HUTANG";

/**
 * ============================================================
 * KATEGORI COA
 * ============================================================
 */

export type KategoriCoa =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "ASET"
  | "UANG_MUKA_PEMBELIAN"
  | "PENDAPATAN"
  | "BEBAN"
  | "PIUTANG"
  | "HUTANG"
  | "PINJAMAN"
  | "PAJAK"
  | "AKUMULASI"
  | "BIAYA"
  | "CLEARING"
  | "WIP"
  | "TENAGA_KERJA"
  | "UANG_MUKA"
  | "PPH23"
  | "PPH4"
  | "TANAH"
  | "LIMESTONE"
  | "BASE_COURSE"
  | "ABU_BATU"
  | "BATU_BELAH"
  | "GEOTEXTILE"
  | "PASIR"
  | "SIRTU"
  | "AGREGAT_A"
  | "AGREGAT_B"
  | "SEMEN"
  | "BESI"
  | "MATERIAL_LAIN"
  | "ASPAL"
  | "WIREMESH"
  | "BBM"
  | "OLI"
  | "SPAREPART"
  | "SEWA_ALAT"
  | "TOL"
  | "PARKIR"
  | "LISTRIK"
  | "AIR"
  | "INTERNET"
  | "ATK"
  | "KEAMANAN"
  | "PERAWATAN"
  | "PERBAIKAN"
  | "SEWA_KANTOR"
  | "SEWA_MESS"
  | "LABORATORIUM"
  | "KONSULTAN"
  | "OPERATOR"
  | "MEKANIK"
  | "UPAH"
  | "SUBKON"
  | "MANAJEMEN_PROYEK"
  | "TENAGA_AHLI"
  | "TEKNISI_ANALIS"
  | "OPERATOR_ALAT_BERAT"
  | "OPERATOR_ANGKUTAN"
  | "PEKERJA_LAPANGAN"
  | "ADMINISTRASI"
  | "TRANSPORTASI"
  | "AKOMODASI"
  | "KONSUMSI"
  | "PERIZINAN"
  | "OVERHEAD"
  | "LAINNYA"
  | "BEBAN_ALAT_BERAT"
  | "AKUMULASI_ALAT_BERAT"
  | "BEBAN_ARMADA"
  | "AKUMULASI_ARMADA"
  | "BEBAN_KENDARAAN"
  | "AKUMULASI_KENDARAAN"
  | "BEBAN_INVENTARIS"
  | "AKUMULASI_INVENTARIS"
  | "BEBAN_PERALATAN"
  | "AKUMULASI_PERALATAN"
  | "BEBAN_BANGUNAN"
  | "AKUMULASI_BANGUNAN"
  | "KAS_ARMADA_BU_BUTET"
  | "TBM"
  | "TM"
  | "BANGUNAN"
  | "PERALATAN"
  | "HUTANG_VENDOR"
  | "HUTANG_OPERASIONAL"
  | "PENJUALAN_TBS"
  | "PENJUALAN_PRODUK"
  | "PEMUPUKAN"
  | "PESTISIDA"
  | "HERBISIDA"
  | "PERAWATAN_TANAMAN"
  | "PANEN"
  | "ANGKUT_TBS"
  | "PEMELIHARAAN_JALAN"
  | "OPERASIONAL_PRODUKSI"
  | "GAJI_PREMI"
  | "REPLANTING"
  | "PERAWATAN_KENDARAAN"
  | "PERAWATAN_PERALATAN"
  | "PENYUSUTAN"
  | "OPERASIONAL_LAINNYA"
  | "PAJAK_RETRIBUSI";

/**
 * ============================================================
 * KATEGORI ASET
 * ============================================================
 */

export type KategoriAset =
  | "ALAT_BERAT"
  | "ARMADA"
  | "KENDARAAN"
  | "INVENTARIS"
  | "PERALATAN"
  | "BANGUNAN";

/**
 * ============================================================
 * HASIL MAPPING
 * ============================================================
 */

export interface CoaMappingDetail {
  id_coa: number;
}

/**
 * ============================================================
 * KONFIGURASI COA ARMADA
 * ============================================================
 *
 * Mapping database:
 *
 *   ARMADA / HUTANG
 *       -> 2570
 *       -> 21106 Hutang Armada
 *
 * ID ini hanya digunakan sebagai safety guard.
 * Source of truth tetap public.coa_mapping.
 */

const ARMADA_HUTANG_COA_ID = 2570;

/**
 * ============================================================
 * KONFIGURASI COA HUTANG VENDOR
 * ============================================================
 *
 * Mapping database:
 *
 *   HUTANG / HUTANG
 *       -> 2747
 *       -> 21107 Hutang Vendor
 *
 * Ini adalah COA hutang vendor umum.
 *
 * Berbeda dengan:
 *
 *   ARMADA / HUTANG
 *       -> 2570
 *       -> 21106 Hutang Armada
 *
 * ID ini hanya digunakan sebagai safety guard.
 * Source of truth tetap public.coa_mapping.
 */

const HUTANG_VENDOR_COA_ID = 2747;

/**
 * ============================================================
 * KONFIGURASI REKENING KORAN
 * ============================================================
 *
 * REKENING_KORAN / BANK
 *     -> id_coa 4
 *
 * COA 4 adalah header/parent Bank.
 * Tidak boleh diposting langsung ke jurnal_detail.
 *
 * COA bank aktual harus berasal dari rekening bank
 * yang digunakan pada transaksi Rekening Koran.
 */

const REKENING_KORAN_BANK_MAPPING_ID = 4;

/**
 * Mapping Rekening Koran yang dapat digunakan
 * sebagai COA lawan/posting.
 */

const REKENING_KORAN_POSTING_KATEGORI: ReadonlySet<KategoriCoa> =
  new Set<KategoriCoa>(["BIAYA", "PAJAK", "CLEARING"]);

/**
 * ============================================================
 * GET COA MAPPING
 * ============================================================
 *
 * Sumber utama:
 *
 *     public.coa_mapping
 *
 * Struktur:
 *
 *     modul + kategori -> id_coa
 *
 * Tidak mengambil COA dari coa_klasifikasi.
 *
 * Validasi dasar:
 *
 *     - mapping tersedia
 *     - id_coa valid
 *     - COA tersedia
 *     - COA aktif
 *
 * is_header tidak divalidasi secara global karena
 * beberapa mapping lama memang dapat menunjuk ke header.
 *
 * Validasi detail dilakukan oleh helper khusus
 * untuk transaksi yang membutuhkan akun posting detail.
 */

export async function getCoaMappingDetail(
  modul: ModulERP,
  kategori: KategoriCoa,
): Promise<CoaMappingDetail> {
  const { data, error } = await db
    .from("coa_mapping")
    .select("id_coa")
    .eq("modul", modul)
    .eq("kategori", kategori)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil COA mapping ${modul}/${kategori}: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(`COA mapping tidak ditemukan (${modul} - ${kategori}).`);
  }

  const idCoa = Number(data.id_coa);

  if (!Number.isInteger(idCoa) || idCoa <= 0) {
    throw new Error(`ID COA mapping tidak valid (${modul} - ${kategori}).`);
  }

  /**
   * ==========================================================
   * VALIDASI KHUSUS REKENING KORAN / BANK
   * ==========================================================
   */

  if (modul === "REKENING_KORAN" && kategori === "BANK") {
    if (idCoa !== REKENING_KORAN_BANK_MAPPING_ID) {
      throw new Error(
        `COA mapping REKENING_KORAN/BANK tidak sesuai konfigurasi. ` +
          `Ditemukan id_coa=${idCoa}, ` +
          `expected id_coa=${REKENING_KORAN_BANK_MAPPING_ID}.`,
      );
    }

    throw new Error(
      `COA mapping REKENING_KORAN/BANK menunjuk ke COA ` +
        `parent/header (id_coa=${idCoa}). ` +
        `Mapping BANK tidak boleh digunakan sebagai COA posting langsung. ` +
        `Gunakan COA bank aktual dari rekening_koran.id_rekening.`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI KATEGORI REKENING KORAN
   * ==========================================================
   */

  if (
    modul === "REKENING_KORAN" &&
    !REKENING_KORAN_POSTING_KATEGORI.has(kategori)
  ) {
    throw new Error(
      `Kategori ${kategori} tidak boleh digunakan sebagai COA posting ` +
        `untuk modul REKENING_KORAN melalui coa_mapping.`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI COA TARGET
   * ==========================================================
   */

  const { data: coa, error: coaError } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif")
    .eq("id_coa", idCoa)
    .maybeSingle();

  if (coaError) {
    throw new Error(
      `Gagal memvalidasi COA ${idCoa} untuk mapping ` +
        `${modul}/${kategori}: ${coaError.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA mapping ${modul}/${kategori} menunjuk ke COA ` +
        `yang tidak ditemukan (id_coa=${idCoa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA mapping ${modul}/${kategori} menunjuk ke COA inactive: ` +
        `${coa.kode} - ${coa.nama}. ` +
        `Mapping harus diperbaiki sebelum transaksi dapat diposting.`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI DETAIL REKENING KORAN
   * ==========================================================
   */

  if (
    modul === "REKENING_KORAN" &&
    REKENING_KORAN_POSTING_KATEGORI.has(kategori)
  ) {
    const { data: coaPosting, error: coaPostingError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_header")
      .eq("id_coa", idCoa)
      .maybeSingle();

    if (coaPostingError) {
      throw new Error(
        `Gagal memvalidasi detail COA Rekening Koran ` +
          `${modul}/${kategori}: ${coaPostingError.message}`,
      );
    }

    if (!coaPosting) {
      throw new Error(
        `COA Rekening Koran ${kategori} tidak ditemukan ` +
          `(id_coa=${idCoa}).`,
      );
    }

    if (coaPosting.is_header) {
      throw new Error(
        `COA Rekening Koran ${kategori} tidak boleh berupa header: ` +
          `${coaPosting.kode} - ${coaPosting.nama} ` +
          `(id_coa=${coaPosting.id_coa}).`,
      );
    }
  }

  return {
    id_coa: idCoa,
  };
}

/**
 * ============================================================
 * GET COA HUTANG ARMADA
 * ============================================================
 *
 * Khusus:
 *
 *     ARMADA / HUTANG
 *         -> 2570
 *         -> 21106 Hutang Armada
 *
 * Validasi:
 *
 *     - mapping benar
 *     - COA tersedia
 *     - aktif
 *     - bukan header
 *     - tipe LIABILITAS
 */

export async function getCoaHutangArmada(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("ARMADA", "HUTANG");

  if (mapping.id_coa !== ARMADA_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang Armada tidak sesuai konfigurasi. ` +
        `Mapping ARMADA/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA Hutang Armada yang dikonfigurasi adalah ` +
        `id_coa=${ARMADA_HUTANG_COA_ID}.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, tipe")
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang Armada: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang Armada tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang Armada tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang Armada tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang Armada harus bertipe LIABILITAS. ` +
        `Ditemukan tipe=${coa.tipe}.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN ARMADA
 * ============================================================
 *
 * COA ini merupakan akun KREDIT ketika pembayaran
 * tagihan Armada dilakukan.
 *
 * Contoh:
 *
 *     Dr 2570 Hutang Armada
 *     Cr 2632 Kas Kecil Bu Butet
 *
 * Syarat:
 *
 *     - COA ada
 *     - aktif
 *     - is_cash = true
 *     - is_header = false
 *
 * Tidak menggunakan:
 *
 *     ARMADA / KAS -> 865
 *
 * karena 865 / 11110 Kas Armada merupakan HEADER.
 */

export async function validateCoaPembayaranArmada(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran Armada tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header, tipe")
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran Armada ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran Armada tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran Armada tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran Armada harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran Armada tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank detail.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN TAGIHAN ARMADA
 * ============================================================
 *
 * Hasil:
 *
 *     DEBIT
 *         id_coa_hutang = 2570
 *
 *     KREDIT
 *         id_coa_kas = COA kas/bank detail pilihan user
 */

export async function getCoaPembayaranTagihanArmada(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const hutang = await getCoaHutangArmada();
  const kas = await validateCoaPembayaranArmada(idCoaKas);

  return {
    id_coa_hutang: hutang.id_coa,
    id_coa_kas: kas.id_coa,
  };
}

/**
 * ============================================================
 * GET COA HUTANG VENDOR
 * ============================================================
 *
 * Khusus hutang vendor umum.
 *
 * Mapping database:
 *
 *     HUTANG / HUTANG
 *         -> 2747
 *         -> 21107 Hutang Vendor
 *
 * Berdasarkan jurnal HTG-11:
 *
 *     Dr 2655 - 5020 Biaya Pokok Jasa
 *     Cr 2747 - 21107 Hutang Vendor
 *
 * Maka ketika hutang dibayar:
 *
 *     Dr 2747 - 21107 Hutang Vendor
 *     Cr COA Kas/Bank DETAIL
 *
 * Tidak menggunakan:
 *
 *     PEMBAYARAN_HUTANG / HUTANG
 *
 * karena mapping tersebut menunjuk ke COA 49
 * yang merupakan HEADER.
 */

export async function getCoaHutangVendor(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("HUTANG", "HUTANG");

  if (mapping.id_coa !== HUTANG_VENDOR_COA_ID) {
    throw new Error(
      `COA Hutang Vendor tidak sesuai konfigurasi. ` +
        `Mapping HUTANG/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA Hutang Vendor yang dikonfigurasi adalah ` +
        `id_coa=${HUTANG_VENDOR_COA_ID}.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, tipe")
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang Vendor: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang Vendor tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang Vendor tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang Vendor tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang Vendor harus bertipe LIABILITAS. ` +
        `Ditemukan tipe=${coa.tipe}.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN HUTANG
 * ============================================================
 *
 * COA ini merupakan akun KREDIT ketika hutang vendor
 * dibayar.
 *
 * Contoh untuk pembayaran:
 *
 *     Dr 2747 - Hutang Vendor
 *     Cr 2632 - Kas Kecil Bu Butet
 *
 * id_coa_kas berasal dari COA aktual yang dipilih user.
 *
 * Tidak menggunakan:
 *
 *     PEMBAYARAN_HUTANG / KAS
 *
 * karena mapping tersebut menunjuk ke:
 *
 *     3 - 11100 Kas
 *
 * dan COA 3 merupakan HEADER.
 *
 * Syarat COA pembayaran:
 *
 *     - COA harus ada
 *     - aktif
 *     - is_cash = true
 *     - is_header = false
 */

export async function validateCoaPembayaranHutang(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran hutang tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header")
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran hutang ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran hutang tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran hutang tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran hutang harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran hutang tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank detail.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * KONFIGURASI COA PIUTANG INVOICE
 * ============================================================
 *
 * Pembayaran Invoice:
 *
 *     DEBIT
 *         12001 - Piutang Usaha
 *
 *     KREDIT
 *         COA Kas/Bank DETAIL yang dipilih user
 *
 * Tidak menggunakan:
 *     - Pajak
 *     - PPN
 *     - PPh23
 *     - Hutang
 *     - Kas header
 *
 * Source of truth tetap public.coa_mapping.
 *
 * Mapping yang digunakan:
 *
 *     PEMBAYARAN_INVOICE / PIUTANG
 *
 * Safety guard:
 *
 *     id_coa = 7
 *     kode   = 12001
 *     nama   = Piutang Usaha
 */

const PIUTANG_INVOICE_COA_ID = 7;

/**
 * ============================================================
 * GET COA PIUTANG UNTUK PEMBAYARAN INVOICE
 * ============================================================
 *
 * COA ini merupakan akun DEBIT ketika invoice dibayar.
 *
 * Contoh:
 *
 *     Invoice Rp1.000.000
 *
 *     Dr 12001 Piutang Usaha       Rp1.000.000
 *     Cr COA Kas/Bank Detail       Rp1.000.000
 *
 * Tidak mengambil COA dari frontend.
 * Tidak menggunakan COA pajak.
 * Tidak menggunakan COA hutang.
 */

export async function getCoaPiutangInvoice(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "PIUTANG");

  if (mapping.id_coa !== PIUTANG_INVOICE_COA_ID) {
    throw new Error(
      `COA Piutang Invoice tidak sesuai konfigurasi. ` +
        `Mapping PEMBAYARAN_INVOICE/PIUTANG menunjuk ke ` +
        `id_coa=${mapping.id_coa}, ` +
        `sedangkan Piutang Usaha yang diharapkan adalah ` +
        `id_coa=${PIUTANG_INVOICE_COA_ID}.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, tipe")
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Piutang Invoice: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Piutang Invoice tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Piutang Invoice tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Piutang Invoice tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA Piutang Invoice harus bertipe ASET. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN INVOICE
 * ============================================================
 *
 * COA ini merupakan akun KREDIT ketika invoice dibayar.
 *
 * COA berasal dari rekening kas/bank DETAIL yang dipilih user.
 *
 * Contoh:
 *
 *     Dr 12001 Piutang Usaha
 *     Cr 170   BNI - 1918768145
 *
 * Syarat:
 *
 *     - COA ada
 *     - aktif
 *     - is_cash = true
 *     - is_header = false
 *     - tipe = ASET
 *
 * Tidak menggunakan:
 *
 *     PEMBAYARAN_INVOICE / KAS
 *
 * jika mapping tersebut menunjuk ke COA header.
 *
 * COA aktual harus diberikan melalui id_coa_kas.
 */

export async function validateCoaPembayaranInvoice(
  idCoaBank: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaBank) || idCoaBank <= 0) {
    throw new Error("COA bank pembayaran invoice tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_cash, is_header, tipe")
    .eq("id_coa", idCoaBank)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA bank pembayaran invoice ` +
        `${idCoaBank}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA bank pembayaran invoice tidak ditemukan ` + `(id_coa=${idCoaBank}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA bank pembayaran invoice tidak aktif: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran invoice harus merupakan ` +
        `akun kas/bank: ${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran invoice tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}. ` +
        `Pilih rekening bank dengan COA detail.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran invoice harus bertipe ASET. ` +
        `Ditemukan tipe=${coa.tipe}.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * KONFIGURASI COA PPH4
 * ============================================================
 *
 * Mapping database yang SUDAH ADA:
 *
 *   PAJAK_PPH4 / BEBAN
 *       -> 2265
 *       -> 62003 Beban Pajak PPh4
 *
 *   PAJAK_PPH4 / HUTANG
 *       -> 2504
 *       -> 21304 Hutang Pajak PPh4
 *
 *   PAJAK_PPH4 / KAS
 *       -> 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * Untuk PEMBAYARAN PPH4:
 *
 *   DEBIT
 *       2504 - 21304 Hutang Pajak PPh4
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual dari id_coa_kas
 *
 * Mapping PAJAK_PPH4 / KAS TIDAK digunakan karena
 * id_coa 3 merupakan COA HEADER.
 */

const PPH4_HUTANG_COA_ID = 2504;

/**
 * ============================================================
 * GET COA HUTANG PPH4
 * ============================================================
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PAJAK_PPH4 / HUTANG
 *       -> 2504
 *
 * COA ini merupakan akun DEBIT saat pembayaran PPh4.
 */

export async function getCoaHutangPph4(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PAJAK_PPH4", "HUTANG");

  if (mapping.id_coa !== PPH4_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang PPh4 tidak sesuai konfigurasi. ` +
        `Mapping PAJAK_PPH4/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA yang diharapkan adalah ` +
        `id_coa=${PPH4_HUTANG_COA_ID} ` +
        `(21304 - Hutang Pajak PPh4). ` +
        `Transaksi pembayaran PPh4 dibatalkan.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select("id_coa, kode, nama, aktif, is_header, tipe, normal_balance")
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang PPh4: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang PPh4 tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang PPh4 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang PPh4 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang PPh4 harus bertipe LIABILITAS. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "KREDIT") {
    throw new Error(
      `COA Hutang PPh4 harus memiliki normal balance KREDIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN PPH4
 * ============================================================
 *
 * COA ini merupakan akun KREDIT saat pembayaran PPh4.
 *
 * id_coa_kas berasal dari pembayaran_pph4.
 *
 * COA harus:
 *
 *   - aktif
 *   - is_cash = true
 *   - is_header = false
 *   - tipe = ASET
 *   - normal_balance = DEBIT
 *
 * Tidak menggunakan:
 *
 *   PAJAK_PPH4 / KAS -> id_coa 3
 *
 * karena COA 3 adalah HEADER.
 */

export async function validateCoaPembayaranPph4(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran PPh4 tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
    )
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran PPh4 ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran PPh4 tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran PPh4 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran PPh4 harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran PPh4 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran PPh4 harus bertipe ASET. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "DEBIT") {
    throw new Error(
      `COA kas/bank pembayaran PPh4 harus memiliki ` +
        `normal balance DEBIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama}.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * KONFIGURASI COA PPN
 * ============================================================
 *
 * Mapping database yang SUDAH ADA:
 *
 *   PPN / ASET
 *       -> 2380
 *       -> 12020 PPN Masukan
 *
 *   PPN / HUTANG
 *       -> 53
 *       -> 21301 Hutang Pajak PPN
 *
 *   PPN / KAS
 *       -> 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * Untuk PEMBAYARAN PPN:
 *
 *   DEBIT
 *       53 - 21301 Hutang Pajak PPN
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual dari id_coa_kas
 *
 * PENTING:
 *
 *   53 / 21301
 *       adalah COA hutang PPN umum.
 *
 *   1210 / 21306
 *       adalah Hutang PPN Proyek.
 *       TIDAK digunakan untuk pembayaran PPN umum.
 *
 *   2380 / 12020
 *       adalah PPN Masukan.
 *       TIDAK digunakan sebagai akun debit pembayaran hutang PPN.
 *
 *   2266 / 62004
 *       adalah Beban Pajak PPN.
 *       TIDAK digunakan untuk pelunasan hutang PPN.
 *
 *   3 / 11100
 *       adalah Kas HEADER.
 *       TIDAK boleh digunakan sebagai jurnal detail.
 *
 * Source of truth:
 *
 *   public.coa_mapping
 */

const PPN_HUTANG_COA_ID = 53;

/**
 * ============================================================
 * GET COA HUTANG PPN
 * ============================================================
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PPN / HUTANG
 *       -> 53
 *       -> 21301 Hutang Pajak PPN
 *
 * COA ini merupakan akun DEBIT ketika pembayaran PPN.
 */

export async function getCoaHutangPpn(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PPN", "HUTANG");

  /**
   * Safety guard terhadap perubahan mapping yang tidak
   * disengaja.
   *
   * Source of truth tetap coa_mapping.
   */
  if (mapping.id_coa !== PPN_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang PPN tidak sesuai konfigurasi. ` +
        `Mapping PPN/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA yang diharapkan adalah ` +
        `id_coa=${PPN_HUTANG_COA_ID} ` +
        `(21301 - Hutang Pajak PPN). ` +
        `Transaksi pembayaran PPN dibatalkan.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_header, is_cash, tipe, normal_balance",
    )
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang PPN: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang PPN tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang PPN tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang PPN tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_cash) {
    throw new Error(
      `COA Hutang PPN tidak boleh merupakan akun kas/bank: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang PPN harus bertipe LIABILITAS. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "KREDIT") {
    throw new Error(
      `COA Hutang PPN harus memiliki normal balance KREDIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN PPH4
 * ============================================================
 *
 * Hasil:
 *
 *   DEBIT
 *       2504 - 21304 Hutang Pajak PPh4
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual
 *
 * Tidak ada:
 *
 *   - 2265 Beban Pajak PPh4
 *   - PPN
 *   - PPh23
 *   - COA pajak tambahan
 *   - Kas header
 */

export async function getCoaPembayaranPph4(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangPph4();

  const coaKas = await validateCoaPembayaranPph4(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN PPN
 * ============================================================
 *
 * COA ini merupakan akun KREDIT ketika PPN dibayar.
 *
 * id_coa_kas berasal dari:
 *
 *   pembayaran_ppn.id_coa_kas
 *
 * atau COA kas/bank DETAIL yang dipilih user pada form.
 *
 * Syarat:
 *
 *   - COA ada
 *   - aktif
 *   - is_cash = true
 *   - is_header = false
 *   - tipe = ASET
 *   - normal_balance = DEBIT
 *
 * Tidak menggunakan:
 *
 *   PPN / KAS
 *       -> id_coa 3
 *       -> 11100 Kas
 *
 * karena COA 3 merupakan HEADER.
 */

export async function validateCoaPembayaranPpn(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran PPN tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
    )
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran PPN ` + `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran PPN tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran PPN tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran PPN harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran PPN tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran PPN harus bertipe ASET. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "DEBIT") {
    throw new Error(
      `COA kas/bank pembayaran PPN harus memiliki ` +
        `normal balance DEBIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  /**
   * Safety guard tambahan:
   *
   * Jangan pernah mengizinkan COA 3 meskipun suatu saat
   * properti COA berubah secara tidak sengaja.
   */
  if (coa.id_coa === 3) {
    throw new Error(
      `COA 3 - 11100 Kas adalah HEADER dan tidak boleh ` +
        `digunakan sebagai COA pembayaran PPN.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN PPN
 * ============================================================
 *
 * Hasil:
 *
 *   DEBIT
 *       53 - 21301 Hutang Pajak PPN
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual
 *
 * Contoh:
 *
 *   Dr 53  - 21301 Hutang Pajak PPN
 *   Cr 170 - 11205 BNI - 1918768145
 *
 * Tidak ada:
 *
 *   - 2380 PPN Masukan
 *   - 2266 Beban Pajak PPN
 *   - 1210 Hutang PPN Proyek
 *   - 3 Kas HEADER
 *   - COA pajak tambahan
 */

export async function getCoaPembayaranPpn(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangPpn();

  const coaKas = await validateCoaPembayaranPpn(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

/**
 * ============================================================
 * KONFIGURASI COA PPH23
 * ============================================================
 *
 * Mapping database yang SUDAH ADA:
 *
 *   PAJAK_PPH23 / BEBAN
 *       -> 2264
 *       -> 62002 Beban Pajak PPh23
 *
 *   PAJAK_PPH23 / HUTANG
 *       -> 55
 *       -> 21303 Hutang Pajak PPh 23
 *
 *   PAJAK_PPH23 / KAS
 *       -> 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * Untuk PEMBAYARAN PPH23:
 *
 *   DEBIT
 *       55 - 21303 Hutang Pajak PPh 23
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual dari id_coa_kas
 *
 * PENTING:
 *
 *   2264 - 62002 Beban Pajak PPh23
 *       TIDAK digunakan sebagai akun debit pembayaran.
 *
 *   1213 - 21308 Hutang PPh23 Proyek
 *       TIDAK digunakan untuk pembayaran PPh23 umum.
 *
 *   3 - 11100 Kas
 *       merupakan HEADER dan TIDAK boleh diposting
 *       sebagai jurnal_detail.
 *
 * Source of truth:
 *
 *   public.coa_mapping
 */

const PPH23_HUTANG_COA_ID = 55;

/**
 * ============================================================
 * GET COA HUTANG PPH23
 * ============================================================
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PAJAK_PPH23 / HUTANG
 *       -> 55
 *       -> 21303 Hutang Pajak PPh 23
 *
 * COA ini merupakan akun DEBIT ketika pembayaran PPh23.
 */

export async function getCoaHutangPph23(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PAJAK_PPH23", "HUTANG");

  /**
   * Safety guard terhadap perubahan mapping yang tidak
   * disengaja.
   *
   * Source of truth tetap coa_mapping.
   */
  if (mapping.id_coa !== PPH23_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang PPh23 tidak sesuai konfigurasi. ` +
        `Mapping PAJAK_PPH23/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA yang diharapkan adalah ` +
        `id_coa=${PPH23_HUTANG_COA_ID} ` +
        `(21303 - Hutang Pajak PPh 23). ` +
        `Transaksi pembayaran PPh23 dibatalkan.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_header, is_cash, tipe, normal_balance",
    )
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang PPh23: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang PPh23 tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang PPh23 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang PPh23 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}).`,
    );
  }

  if (coa.is_cash) {
    throw new Error(
      `COA Hutang PPh23 tidak boleh merupakan akun kas/bank: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang PPh23 harus bertipe LIABILITAS. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "KREDIT") {
    throw new Error(
      `COA Hutang PPh23 harus memiliki normal balance KREDIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN PPH23
 * ============================================================
 *
 * COA ini merupakan akun KREDIT saat pembayaran PPh23.
 *
 * id_coa_kas berasal dari:
 *
 *   pembayaran_pph23.id_coa_kas
 *
 * atau COA kas/bank DETAIL yang dipilih user pada form.
 *
 * Syarat:
 *
 *   - COA ada
 *   - aktif
 *   - is_cash = true
 *   - is_header = false
 *   - tipe = ASET
 *   - normal_balance = DEBIT
 *
 * Tidak menggunakan:
 *
 *   PAJAK_PPH23 / KAS
 *
 * karena mapping tersebut menunjuk ke:
 *
 *   3 - 11100 Kas
 *
 * dan COA 3 merupakan HEADER.
 */

export async function validateCoaPembayaranPph23(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran PPh23 tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
    )
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran PPh23 ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran PPh23 tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran PPh23 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran PPh23 harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran PPh23 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran PPh23 harus bertipe ASET. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "DEBIT") {
    throw new Error(
      `COA kas/bank pembayaran PPh23 harus memiliki ` +
        `normal balance DEBIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  /**
   * Safety guard:
   *
   * COA 3 = 11100 Kas
   * merupakan HEADER dan tidak boleh menjadi
   * jurnal_detail.
   */
  if (coa.id_coa === 3) {
    throw new Error(
      `COA 3 - 11100 Kas adalah HEADER dan tidak boleh ` +
        `digunakan sebagai COA pembayaran PPh23.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN PPH23
 * ============================================================
 *
 * Hasil:
 *
 *   DEBIT
 *       55 - 21303 Hutang Pajak PPh 23
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual
 *
 * Contoh:
 *
 *   Dr 55  - 21303 Hutang Pajak PPh 23
 *   Cr 170 - BNI - 1918768145
 *
 * Tidak ada:
 *
 *   - 2264 Beban Pajak PPh23
 *   - 1213 Hutang PPh23 Proyek
 *   - 3 Kas HEADER
 *   - PPN
 *   - PPh4
 *   - COA pajak tambahan
 */

export async function getCoaPembayaranPph23(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangPph23();

  const coaKas = await validateCoaPembayaranPph23(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

const PPH21_HUTANG_COA_ID = 54;

export async function getCoaHutangPph21(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PAJAK", "HUTANG");

  if (mapping.id_coa !== PPH21_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang PPh21 tidak sesuai konfigurasi. ` +
        `Mapping PAJAK/HUTANG menunjuk ke id_coa=${mapping.id_coa}, ` +
        `sedangkan COA yang diwajibkan adalah ` +
        `${PPH21_HUTANG_COA_ID} ` +
        `(21302 - Hutang Pajak PPh 21).`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_header, is_cash, tipe, normal_balance",
    )
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang PPh21: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang PPh21 tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang PPh21 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang PPh21 tidak boleh berupa HEADER: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_cash) {
    throw new Error(
      `COA Hutang PPh21 tidak boleh merupakan COA kas/bank: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang PPh21 harus bertipe LIABILITAS. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "KREDIT") {
    throw new Error(
      `COA Hutang PPh21 harus memiliki normal balance KREDIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

export async function validateCoaPembayaranPph21(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran PPh21 tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
    )
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran PPh21 ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran PPh21 tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran PPh21 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran PPh21 harus merupakan ` +
        `akun kas/bank: ${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran PPh21 tidak boleh HEADER: ` +
        `${coa.kode} - ${coa.nama}. ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran PPh21 harus bertipe ASET: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.normal_balance !== "DEBIT") {
    throw new Error(
      `COA pembayaran PPh21 harus memiliki normal balance DEBIT: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  /*
   * 3 = 11100 Kas HEADER.
   *
   * Tidak boleh masuk jurnal_detail.
   */
  if (coa.id_coa === 3) {
    throw new Error(
      "COA 3 - 11100 Kas adalah HEADER. " + "Gunakan COA kas/bank DETAIL.",
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

export async function getCoaPembayaranPph21(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangPph21();

  const coaKas = await validateCoaPembayaranPph21(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

/**
 * ============================================================
 * KONFIGURASI COA PPH25
 * ============================================================
 *
 * Mapping database yang SUDAH ADA:
 *
 *   PAJAK_PPH25 / BEBAN
 *       -> 2507
 *       -> 62005 Beban Pajak PPh25
 *
 *   PAJAK_PPH25 / HUTANG
 *       -> 2508
 *       -> 21305 Hutang Pajak PPh25
 *
 *   PAJAK_PPH25 / KAS
 *       -> 3
 *       -> 11100 Kas
 *       -> HEADER
 *
 * Untuk PEMBAYARAN PPH25:
 *
 *   DEBIT
 *       2508 - 21305 Hutang Pajak PPh25
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual dari id_coa_kas
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * Mapping KAS id_coa 3 tidak digunakan langsung
 * sebagai jurnal_detail karena merupakan COA HEADER.
 */

const PPH25_HUTANG_COA_ID = 2508;

/**
 * ============================================================
 * GET COA HUTANG PPH25
 * ============================================================
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * Mapping:
 *
 *   PAJAK_PPH25 / HUTANG
 *       -> 2508
 *       -> 21305 Hutang Pajak PPh25
 *
 * COA ini merupakan akun DEBIT ketika pembayaran PPh25.
 */
export async function getCoaHutangPph25(): Promise<CoaMappingDetail> {
  const mapping = await getCoaMappingDetail("PAJAK_PPH25", "HUTANG");

  /**
   * ==========================================================
   * SAFETY GUARD
   * ==========================================================
   *
   * Source of truth tetap coa_mapping.
   *
   * Tetapi jika mapping berubah tidak sengaja,
   * transaksi pembayaran harus dihentikan.
   */
  if (mapping.id_coa !== PPH25_HUTANG_COA_ID) {
    throw new Error(
      `COA Hutang PPh25 tidak sesuai konfigurasi. ` +
        `Mapping PAJAK_PPH25/HUTANG menunjuk ke ` +
        `id_coa=${mapping.id_coa}, ` +
        `sedangkan COA yang diharapkan adalah ` +
        `id_coa=${PPH25_HUTANG_COA_ID} ` +
        `(21305 - Hutang Pajak PPh25). ` +
        `Transaksi pembayaran PPh25 dibatalkan.`,
    );
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_header, is_cash, tipe, normal_balance",
    )
    .eq("id_coa", mapping.id_coa)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA Hutang PPh25: ${error.message}`);
  }

  if (!coa) {
    throw new Error(
      `COA Hutang PPh25 tidak ditemukan ` + `(id_coa=${mapping.id_coa}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA Hutang PPh25 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA Hutang PPh25 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}).`,
    );
  }

  if (coa.is_cash) {
    throw new Error(
      `COA Hutang PPh25 tidak boleh merupakan akun kas/bank: ` +
        `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (coa.tipe !== "LIABILITAS") {
    throw new Error(
      `COA Hutang PPh25 harus bertipe LIABILITAS. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "KREDIT") {
    throw new Error(
      `COA Hutang PPh25 harus memiliki normal balance KREDIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(normal_balance=${coa.normal_balance}).`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * VALIDASI COA PEMBAYARAN PPH25
 * ============================================================
 *
 * COA ini merupakan akun KREDIT ketika PPh25 dibayar.
 *
 * id_coa_kas berasal dari:
 *
 *   pembayaran_pph25.id_coa_kas
 *
 * atau COA Kas/Bank DETAIL yang dipilih user.
 *
 * Syarat:
 *
 *   - COA ada
 *   - aktif
 *   - is_cash = true
 *   - is_header = false
 *   - tipe = ASET
 *   - normal_balance = DEBIT
 *
 * Tidak menggunakan:
 *
 *   PAJAK_PPH25 / KAS
 *
 * karena mapping tersebut menunjuk ke:
 *
 *   3 - 11100 Kas
 *
 * dan COA 3 merupakan HEADER.
 */
export async function validateCoaPembayaranPph25(
  idCoaKas: number,
): Promise<CoaMappingDetail> {
  if (!Number.isInteger(idCoaKas) || idCoaKas <= 0) {
    throw new Error("COA pembayaran PPh25 tidak valid.");
  }

  const { data: coa, error } = await db
    .from("coa")
    .select(
      "id_coa, kode, nama, aktif, is_cash, is_header, tipe, normal_balance",
    )
    .eq("id_coa", idCoaKas)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memvalidasi COA pembayaran PPh25 ` +
        `${idCoaKas}: ${error.message}`,
    );
  }

  if (!coa) {
    throw new Error(
      `COA pembayaran PPh25 tidak ditemukan ` + `(id_coa=${idCoaKas}).`,
    );
  }

  if (!coa.aktif) {
    throw new Error(
      `COA pembayaran PPh25 tidak aktif: ` + `${coa.kode} - ${coa.nama}.`,
    );
  }

  if (!coa.is_cash) {
    throw new Error(
      `COA pembayaran PPh25 harus merupakan akun kas/bank. ` +
        `${coa.kode} - ${coa.nama} bukan akun cash.`,
    );
  }

  if (coa.is_header) {
    throw new Error(
      `COA pembayaran PPh25 tidak boleh berupa header: ` +
        `${coa.kode} - ${coa.nama} ` +
        `(id_coa=${coa.id_coa}). ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(
      `COA pembayaran PPh25 harus bertipe ASET. ` +
        `Ditemukan ${coa.kode} - ${coa.nama} ` +
        `(tipe=${coa.tipe}).`,
    );
  }

  if (coa.normal_balance !== "DEBIT") {
    throw new Error(
      `COA kas/bank pembayaran PPh25 harus memiliki ` +
        `normal balance DEBIT. ` +
        `Ditemukan ${coa.kode} - ${coa.nama}.`,
    );
  }

  /**
   * ==========================================================
   * SAFETY GUARD KAS HEADER
   * ==========================================================
   *
   * Mapping PAJAK_PPH25/KAS:
   *
   *   id_coa = 3
   *   11100 Kas
   *
   * merupakan HEADER.
   *
   * Jangan pernah izinkan masuk ke jurnal_detail.
   */
  if (coa.id_coa === 3) {
    throw new Error(
      `COA 3 - 11100 Kas adalah HEADER dan tidak boleh ` +
        `digunakan sebagai COA pembayaran PPh25. ` +
        `Pilih COA kas/bank DETAIL.`,
    );
  }

  return {
    id_coa: coa.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN PPH25
 * ============================================================
 *
 * Hasil:
 *
 *   DEBIT
 *       2508 - 21305 Hutang Pajak PPh25
 *
 *   KREDIT
 *       COA Kas/Bank DETAIL aktual
 *
 * Contoh:
 *
 *   Dr 2508 - 21305 Hutang Pajak PPh25
 *   Cr 170  - 11205 BNI - 1918768145
 *
 * Tidak ada:
 *
 *   - 2507 - 62005 Beban Pajak PPh25
 *   - 3 - 11100 Kas HEADER
 *   - 2722 - 21300 Utang Pajak HEADER
 *   - PPN
 *   - PPh21
 *   - PPh23
 *   - PPh4
 */
export async function getCoaPembayaranPph25(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangPph25();

  const coaKas = await validateCoaPembayaranPph25(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN INVOICE
 * ============================================================
 *
 * Hasil:
 *
 *     DEBIT
 *         id_coa_piutang
 *
 *         12001 - Piutang Usaha
 *
 *     KREDIT
 *         id_coa_kas
 *
 *         COA Kas/Bank DETAIL pilihan user
 *
 * Tidak ada COA pajak.
 * Tidak ada COA hutang.
 */

export async function getCoaPembayaranInvoice(idCoaBank: number): Promise<{
  id_coa_piutang: number;
  id_coa_kas: number;
}> {
  const piutang = await getCoaPiutangInvoice();

  const bank = await validateCoaPembayaranInvoice(idCoaBank);

  return {
    id_coa_piutang: piutang.id_coa,
    id_coa_kas: bank.id_coa,
  };
}

/**
 * ============================================================
 * COA UNTUK POSTING PEMBAYARAN HUTANG
 * ============================================================
 *
 * Fungsi ini mengembalikan dua COA yang dibutuhkan
 * untuk jurnal pembayaran hutang.
 *
 * DEBIT:
 *
 *     id_coa_hutang
 *
 *     HUTANG / HUTANG
 *         -> 2747
 *         -> 21107 Hutang Vendor
 *
 * KREDIT:
 *
 *     id_coa_kas
 *
 *     COA Kas/Bank DETAIL aktual yang dipilih user.
 *
 * Tidak ada COA hutang yang diterima dari frontend.
 */

export async function getCoaPembayaranHutang(idCoaKas: number): Promise<{
  id_coa_hutang: number;
  id_coa_kas: number;
}> {
  const coaHutang = await getCoaHutangVendor();
  const coaKas = await validateCoaPembayaranHutang(idCoaKas);

  return {
    id_coa_hutang: coaHutang.id_coa,
    id_coa_kas: coaKas.id_coa,
  };
}

/**
 * ============================================================
 * ACCOUNTING PROYEK MASTER
 * ============================================================
 *
 * COA Proyek Master TIDAK di-hardcode di TypeScript.
 *
 * Source of truth:
 *
 *   public.coa_mapping
 *
 * dengan:
 *
 *   modul = 'PROYEK'
 *
 * Database trigger kemudian membuat relasi:
 *
 *   proyek_master.id
 *          ↓
 *   public.proyek_coa
 *
 * Tidak menggunakan:
 *
 *   - id_coa = 7
 *   - id_coa = 872
 *   - id_coa = 1206
 *
 * secara langsung.
 */

export interface ProyekCoaMappingItem {
  id_coa: number;
  kategori: KategoriCoa;
}

export interface ProyekCoaMappingResult {
  id_proyek: string;
  mappings: ProyekCoaMappingItem[];
}

/**
 * Mengambil seluruh COA yang dikonfigurasikan untuk modul PROYEK.
 *
 * Fungsi ini digunakan untuk memastikan konfigurasi COA proyek
 * yang akan direalisasikan oleh trigger database valid.
 */
export async function getCoaMappingProyek(): Promise<ProyekCoaMappingItem[]> {
  const { data, error } = await db
    .from("coa_mapping")
    .select("id_coa, kategori")
    .eq("modul", "PROYEK");

  if (error) {
    throw new Error(`Gagal mengambil COA mapping Proyek: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("COA mapping untuk modul PROYEK belum tersedia.");
  }

  const mappings: ProyekCoaMappingItem[] = [];

  for (const row of data) {
    const idCoa = Number(row.id_coa);
    const kategori = row.kategori;

    if (!Number.isInteger(idCoa) || idCoa <= 0) {
      throw new Error(
        `COA mapping PROYEK memiliki id_coa tidak valid: ${String(
          row.id_coa,
        )}.`,
      );
    }

    if (typeof kategori !== "string" || kategori.trim().length === 0) {
      throw new Error(`COA mapping PROYEK memiliki kategori yang tidak valid.`);
    }

    const { data: coa, error: coaError } = await db
      .from("coa")
      .select(
        "id_coa, kode, nama, aktif, is_header, is_cash, tipe, normal_balance",
      )
      .eq("id_coa", idCoa)
      .maybeSingle();

    if (coaError) {
      throw new Error(
        `Gagal memvalidasi COA Proyek ${idCoa}: ${coaError.message}`,
      );
    }

    if (!coa) {
      throw new Error(
        `COA mapping PROYEK/${kategori} menunjuk ke COA ` +
          `yang tidak ditemukan (id_coa=${idCoa}).`,
      );
    }

    if (!coa.aktif) {
      throw new Error(
        `COA mapping PROYEK/${kategori} menunjuk ke COA ` +
          `yang tidak aktif: ${coa.kode} - ${coa.nama}.`,
      );
    }

    mappings.push({
      id_coa: coa.id_coa,
      kategori: kategori as KategoriCoa,
    });
  }

  return mappings;
}
