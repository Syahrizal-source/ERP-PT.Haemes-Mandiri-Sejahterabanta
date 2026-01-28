import { db } from "@/lib/supabase/server";

export interface ActivePeriode {
  id_periode: number;
  status: "OPEN";
}

/**
 * Ambil periode aktif (OPEN) terbaru
 * Dipakai oleh: Armada, Alat Berat, Proyek, Kebun Sawit, dll
 */
export async function getActivePeriode(): Promise<ActivePeriode> {
  const { data, error } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Tidak ada periode aktif (OPEN)");
  }

  return {
    id_periode: data.id_periode,
    status: "OPEN",
  };
}
