import { db } from "@/lib/supabase/server";

type KasbonSaldoRow = {
  id: string;
  debit: number;
  kredit: number;
};

export async function recalculateKasbonPribadiSaldo(): Promise<void> {
  const { data, error } = await db
    .from("kasbon_pribadi")
    .select("id,debit,kredit")
    .order("tanggal", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    throw new Error("Gagal ambil data kasbon_pribadi");
  }

  let runningSaldo = 0;

  for (const row of data as KasbonSaldoRow[]) {
    runningSaldo += Number(row.debit) - Number(row.kredit);

    const { error: updateError } = await db
      .from("kasbon_pribadi")
      .update({ saldo: runningSaldo })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}
