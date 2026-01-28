import { db } from "@/lib/supabase/server";

export async function postArmadaToCashFlow(idArmada: number): Promise<void> {
  const { data: armada } = await db
    .from("armada")
    .select("*")
    .eq("id", idArmada)
    .single();
  if (!armada) return;

  const penerimaan = Number(armada.jumlah_tagihan);
  const pengeluaran =
    Number(armada.belanja) +
    Number(armada.mel) +
    Number(armada.tambal_ban) +
    Number(armada.inap_um) +
    Number(armada.adm);

  await db.from("cash_flow_armada").insert({
    tanggal: armada.tanggal,
    sopir: armada.supir,
    penerimaan,
    pengeluaran,
    kasbon: Number(armada.jumlah_uang_jalan),
    pengembalian: 0,
  });
}
