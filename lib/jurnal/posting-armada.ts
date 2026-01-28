import { db } from "@/lib/supabase/server";
import { getActivePeriode } from "@/lib/periode/get-active";
import { resolveCOA } from "@/lib/coa/resolve-coa";

export async function postArmadaToJurnal(idArmada: number): Promise<void> {
  const { data: armada } = await db
    .from("armada")
    .select("*")
    .eq("id", idArmada)
    .single();
  if (!armada) throw new Error("Armada tidak ditemukan");

  const periode = await getActivePeriode();

  const pendapatan = Number(armada.jumlah_tagihan);
  const beban =
    Number(armada.belanja) +
    Number(armada.mel) +
    Number(armada.tambal_ban) +
    Number(armada.inap_um) +
    Number(armada.adm);

  const coaKas = await resolveCOA("ARMADA", "KAS");
  const coaPendapatan = await resolveCOA("ARMADA", "PENDAPATAN");
  const coaBeban = await resolveCOA("ARMADA", "BEBAN");

  const { data: header } = await db
    .from("jurnal")
    .insert({
      tanggal: armada.tanggal,
      no_bukti: armada.kode_transaksi,
      keterangan: `ARMADA ${armada.no_polisi}`,
      id_periode: periode.id_periode,
      sumber: "ARMADA",
    })
    .select("id_jurnal")
    .single();

  if (!header) throw new Error("Gagal buat jurnal armada");

  const details = [
    {
      id_jurnal: header.id_jurnal,
      id_coa: coaKas,
      debit: pendapatan,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: coaPendapatan,
      debit: 0,
      kredit: pendapatan,
    },
    { id_jurnal: header.id_jurnal, id_coa: coaBeban, debit: beban, kredit: 0 },
    { id_jurnal: header.id_jurnal, id_coa: coaKas, debit: 0, kredit: beban },
  ];

  const totalDebit = details.reduce((s, d) => s + d.debit, 0);
  const totalKredit = details.reduce((s, d) => s + d.kredit, 0);
  if (totalDebit !== totalKredit) throw new Error("Jurnal tidak balance");

  await db.from("jurnal_detail").insert(details);
}
