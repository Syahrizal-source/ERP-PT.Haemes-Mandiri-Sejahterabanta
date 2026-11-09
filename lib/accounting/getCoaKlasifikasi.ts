import { db } from "@/lib/supabase/server";

export type PeranAkun = "HEADER" | "DETAIL";

export type PerilakuBiaya = "FIXED" | "VARIABLE" | "SEMI_VARIABLE" | "MIXED";

export type SifatBiaya = "DIRECT" | "INDIRECT";

export type KlasifikasiBiaya = "PRODUCT" | "PERIOD";

export type JenisBeban =
  | "OPERATING"
  | "SELLING"
  | "GENERAL_ADMINISTRATIVE"
  | "INTEREST"
  | "DEPRECIATION"
  | "TAX";

export type AlokasiBiaya = "DIRECT" | "INDIRECT";

export type KelompokBiaya =
  | "HPP"
  | "MATERIAL"
  | "TENAGA_KERJA"
  | "ALAT"
  | "OVERHEAD"
  | "ADMINISTRASI"
  | "PENYUSUTAN"
  | "PAJAK"
  | "FINANCE"
  | "LAINNYA";

export type KlasifikasiLaporan = "HPP" | "OPERASIONAL" | "NON_OPERASIONAL";

export type ModulKlasifikasi =
  | "GENERAL"
  | "ARMADA"
  | "ALAT_BERAT"
  | "PROYEK"
  | "KEBUN_SAWIT";

export interface CoaKlasifikasi {
  id_klasifikasi: number;
  id_coa: number;
  peran_akun: PeranAkun | null;
  perilaku_biaya: PerilakuBiaya | null;
  sifat_biaya: SifatBiaya | null;
  klasifikasi_biaya: KlasifikasiBiaya | null;
  jenis_beban: JenisBeban | null;
  alokasi_biaya: AlokasiBiaya | null;
  kelompok_biaya: KelompokBiaya | null;
  klasifikasi_laporan: KlasifikasiLaporan | null;
  modul: ModulKlasifikasi | null;
  catatan: string | null;
  aktif: boolean;
}

export async function getCoaKlasifikasi(
  idCoa: number,
): Promise<CoaKlasifikasi | null> {
  const { data, error } = await db
    .from("coa_klasifikasi")
    .select(
      `
        id_klasifikasi,
        id_coa,
        peran_akun,
        perilaku_biaya,
        sifat_biaya,
        klasifikasi_biaya,
        jenis_beban,
        alokasi_biaya,
        kelompok_biaya,
        klasifikasi_laporan,
        modul,
        catatan,
        aktif
      `,
    )
    .eq("id_coa", idCoa)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil klasifikasi COA ${idCoa}: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return {
    id_klasifikasi: Number(data.id_klasifikasi),
    id_coa: Number(data.id_coa),
    peran_akun: data.peran_akun,
    perilaku_biaya: data.perilaku_biaya,
    sifat_biaya: data.sifat_biaya,
    klasifikasi_biaya: data.klasifikasi_biaya,
    jenis_beban: data.jenis_beban,
    alokasi_biaya: data.alokasi_biaya,
    kelompok_biaya: data.kelompok_biaya,
    klasifikasi_laporan: data.klasifikasi_laporan,
    modul: data.modul,
    catatan: data.catatan,
    aktif: data.aktif,
  };
}
