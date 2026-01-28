export type HMSResult = {
  total_pendapatan: number;
  total_beban: number;
  laba_rugi: number;
};

export async function calcHMSLabaRugi(
  db: import("@supabase/supabase-js").SupabaseClient,
  id_periode: number,
): Promise<HMSResult> {
  // 1️⃣ Ambil semua detail jurnal periode ini
  const { data: details, error: detailError } = await db
    .from("jurnal_detail")
    .select("id_coa,debit,kredit,jurnal!inner(id_periode,sumber)")
    .eq("jurnal.id_periode", id_periode)
    .in("jurnal.sumber", ["UMUM", "PENYESUAIAN"]);

  if (detailError || !details) {
    throw new Error("Gagal ambil jurnal_detail periode");
  }

  if (details.length === 0) {
    return {
      total_pendapatan: 0,
      total_beban: 0,
      laba_rugi: 0,
    };
  }

  // 2️⃣ Ambil tipe COA yang dipakai
  const coaIds = Array.from(new Set(details.map((d) => d.id_coa)));

  const { data: coaRows, error: coaError } = await db
    .from("coa")
    .select("id_coa,tipe")
    .in("id_coa", coaIds);

  if (coaError || !coaRows) {
    throw new Error("Gagal ambil COA");
  }

  const coaMap = new Map<number, string>();
  for (const c of coaRows) {
    coaMap.set(c.id_coa, c.tipe);
  }

  // 3️⃣ Hitung HMS / UT
  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const d of details) {
    const tipe = coaMap.get(d.id_coa);

    if (tipe === "PENDAPATAN") {
      totalPendapatan += d.kredit - d.debit;
    }

    if (tipe === "BEBAN") {
      totalBeban += d.debit - d.kredit;
    }
  }

  return {
    total_pendapatan: Math.abs(totalPendapatan),
    total_beban: Math.abs(totalBeban),
    laba_rugi: Math.abs(totalPendapatan - totalBeban),
  };
}
