import { db } from "@/lib/supabase/server";

export interface RegulasiPajak {
  kode_pajak: string;
  tarif: number;
  coa_beban: number | null;
  coa_hutang: number | null;
}

export async function getActiveRegulasi(
  kodePajak: string,
): Promise<RegulasiPajak> {
  const { data, error } = await db
    .from("regulasi_pajak")
    .select("kode_pajak, tarif, coa_beban, coa_hutang")
    .eq("kode_pajak", kodePajak)
    .eq("aktif", true)
    .order("versi", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Regulasi aktif tidak ditemukan: ${kodePajak}`);
  }

  return {
    kode_pajak: data.kode_pajak as string,
    tarif: Number(data.tarif),
    coa_beban: data.coa_beban ? Number(data.coa_beban) : null,
    coa_hutang: data.coa_hutang ? Number(data.coa_hutang) : null,
  };
}
