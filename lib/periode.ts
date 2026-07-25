import { db } from "@/lib/supabase/server";

type Periode = {
  id_periode: number;
  status: "OPEN" | "CLOSED";
  is_closed: boolean;
};

export async function getPeriodeAktif(): Promise<Periode> {
  const { data, error } = await db
    .from("periode")
    .select("id_periode, status, is_closed")
    .eq("status", "OPEN")
    .single();

  if (error || !data) {
    throw new Error("Tidak ada periode OPEN");
  }

  if (data.is_closed === true) {
    throw new Error("Periode sudah ditutup");
  }

  return data;
}
