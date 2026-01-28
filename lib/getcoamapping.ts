import { SupabaseClient } from "@supabase/supabase-js";
import { CoaMappingDetail } from "@/types/kebun";

export async function getCoaMappingDetail(
  db: SupabaseClient,
  coaMappingId: number,
  jenisTransaksi: string,
  lokasi: string,
): Promise<CoaMappingDetail[]> {
  const { data, error } = await db
    .from("coa_mapping_detail")
    .select("id_coa, posisi")
    .eq("coa_mapping_id", coaMappingId)
    .eq("jenis_transaksi", jenisTransaksi)
    .eq("lokasi", lokasi);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("COA mapping tidak ditemukan untuk lokasi ini");
  }

  return data as CoaMappingDetail[];
}
