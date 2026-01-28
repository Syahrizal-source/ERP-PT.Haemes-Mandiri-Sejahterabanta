import { db } from "@/lib/supabase/server";

export async function postRegulasiPajak(
  kodePajak: string,
  tanggal: string,
  nominal: number,
): Promise<void> {
  const { data: reg } = await db
    .from("regulasi_pajak")
    .select("coa_beban,coa_hutang")
    .eq("kode_pajak", kodePajak)
    .eq("aktif", true)
    .single();

  if (!reg) return;

  const { data: header } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti: `REG-${kodePajak}-${Date.now()}`,
      keterangan: `Posting pajak ${kodePajak}`,
      id_periode: 1,
      sumber: "PAJAK",
    })
    .select("id_jurnal")
    .single();

  if (!header) return;

  await db.from("jurnal_detail").insert([
    {
      id_jurnal: header.id_jurnal,
      id_coa: reg.coa_beban,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: reg.coa_hutang,
      debit: 0,
      kredit: nominal,
    },
  ]);
}
