import { db } from "@/lib/supabase/server";

export interface CoaTransaksi {
  id_coa: number;
  posisi: "DEBIT" | "KREDIT";
}

export async function getCoaMappingTransaction(
  jenis: string,
  regionId: string,
): Promise<CoaTransaksi[]> {
  const { data, error } = await db
    .from("coa_mapping_detail")
    .select("id_coa,posisi")
    .eq("jenis_transaksi", jenis)
    .eq("region_id", regionId)
    .order("posisi");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `COA Mapping ${jenis} untuk Region ${regionId} belum dibuat`,
    );
  }

  return data;
}
