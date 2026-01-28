import { db } from "@/lib/supabase/server";

export async function postArmadaPPN(idArmada: number): Promise<void> {
  const { data } = await db
    .from("armada")
    .select("*")
    .eq("id", idArmada)
    .single();
  if (!data) return;

  const nilaiPPN = Number(data.jumlah_tagihan) * 0.11;

  await db.from("ppn").insert({
    id_transaksi: idArmada,
    jenis_ppn: "keluaran",
    nilai_dasar: data.jumlah_tagihan,
    tarif_ppn: 11,
    nilai_ppn: nilaiPPN,
    tanggal_transaksi: data.tanggal,
  });
}

export async function postArmadaPPh23(idArmada: number): Promise<void> {
  const { data } = await db
    .from("armada")
    .select("*")
    .eq("id", idArmada)
    .single();
  if (!data || Number(data.koordinasi) <= 0) return;

  const nilaiPPh23 = Number(data.koordinasi) * 0.02;

  await db.from("pph23").insert({
    id_vendor: 1,
    jenis_jasa: "Jasa Armada",
    nilai_transaksi: data.koordinasi,
    tarif_pph23: 2,
    pph23_terutang: nilaiPPh23,
    tanggal_transaksi: data.tanggal,
  });
}
