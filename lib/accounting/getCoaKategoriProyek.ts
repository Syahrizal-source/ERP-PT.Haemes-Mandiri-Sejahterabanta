import { db } from "@/lib/supabase/server";

import {
  getCoaMappingDetail,
  CoaMappingDetail,
  KategoriCoa,
} from "./getcoamapping";

export async function getCoaKategoriProyek(
  idKategori: number,
): Promise<CoaMappingDetail> {
  const { data, error } = await db
    .from("kategori_biaya_proyek")
    .select("kode")
    .eq("id", idKategori)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Kategori biaya proyek tidak ditemukan.");
  }

  return await getCoaMappingDetail("PROYEK", data.kode as KategoriCoa);
}
