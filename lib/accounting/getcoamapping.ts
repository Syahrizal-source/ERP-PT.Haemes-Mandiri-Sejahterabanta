import { db } from "@/lib/supabase/server";

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
  | "KOREKSI";

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

  /* =========================
     PROYEK
  ========================= */
  | "WIP"
  | "TENAGA_KERJA"

  // Material
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

  // Operasional
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

  // SDM
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

  // Overhead
  | "TRANSPORTASI"
  | "AKOMODASI"
  | "KONSUMSI"
  | "PERIZINAN"
  | "OVERHEAD"
  | "LAINNYA"

  /* =========================
     DEPRESIASI
  ========================= */
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
  | "AKUMULASI_BANGUNAN";
export type KategoriAset =
  | "ALAT_BERAT"
  | "ARMADA"
  | "KENDARAAN"
  | "INVENTARIS"
  | "PERALATAN"
  | "BANGUNAN";

export interface CoaMappingDetail {
  id_coa: number;
}

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

  return {
    id_coa: Number(data.id_coa),
  };
}
