import { db } from "@/lib/supabase/server";

export interface PajakAktif {
  kode_pajak: string;
  tarif: number;
  coa_beban: number | null;
  coa_hutang: number | null;
}

export async function getPajakAktif(
  kode: string,
  tahun: number,
): Promise<PajakAktif> {
  const { data, error } = await db
    .from("regulasi_pajak")
    .select("kode_pajak, tarif, coa_beban, coa_hutang")
    .eq("kode_pajak", kode)
    .eq("tahun", tahun)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Regulasi pajak ${kode} tidak ditemukan`);
  }

  return data;
}
