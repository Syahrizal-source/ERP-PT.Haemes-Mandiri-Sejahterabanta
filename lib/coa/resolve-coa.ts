import { db } from "@/lib/supabase/server";
import type { ModulUsaha, KategoriCOA } from "@/types/coa-mapping";

export async function resolveCOA(
  modul: ModulUsaha,
  kategori: KategoriCOA,
): Promise<number> {
  const { data, error } = await db
    .from("coa_mapping")
    .select("id_coa")
    .eq("modul", modul)
    .eq("kategori", kategori)
    .single();

  if (error || !data) {
    throw new Error(`COA mapping tidak ditemukan: ${modul} - ${kategori}`);
  }

  return data.id_coa;
}
