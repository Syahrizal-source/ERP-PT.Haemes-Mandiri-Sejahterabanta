import { db } from "@/lib/supabase/server";

export async function validatePeriodeOpen(id_periode: number): Promise<void> {
  const { data, error } = await db
    .from("periode")
    .select("status")
    .eq("id_periode", id_periode)
    .single();

  if (error || !data) {
    throw new Error("Periode tidak ditemukan");
  }

  if (data.status !== "OPEN") {
    throw new Error("Periode sudah ditutup (CLOSED)");
  }
}
