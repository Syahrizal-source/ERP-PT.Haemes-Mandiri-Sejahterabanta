import { db } from "@/lib/supabase/server";

export type ModulERP =
  | "ARMADA"
  | "KAS_ARMADA"
  | "ALAT_BERAT"
  | "PROYEK"
  | "KEBUN"
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
  | "ASET"
  | "PENDAPATAN"
  | "BEBAN"
  | "PIUTANG"
  | "HUTANG"
  | "PINJAMAN"
  | "PAJAK"
  | "AKUMULASI"
  | "BIAYA"
  | "BANK"
  | "CLEARING";

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
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`COA mapping tidak ditemukan (${modul} - ${kategori})`);
  }

  const result: CoaMappingDetail = {
    id_coa: Number(data.id_coa),
  };

  return result;
}
