import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/* ===============================
   TYPES
================================ */
export type PeriodeStatus = "OPEN" | "CLOSED";

interface PeriodeLockRow {
  id_periode: string; // BIGINT → string
  status: PeriodeStatus;
}

/* ===============================
   CHECK PERIODE LOCK
================================ */
export async function isPeriodeClosed(id_periode: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("periode")
    .select("id_periode, status")
    .eq("id_periode", id_periode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Periode tidak ditemukan");
  }

  const row = data as PeriodeLockRow;

  return row.status === "CLOSED";
}
