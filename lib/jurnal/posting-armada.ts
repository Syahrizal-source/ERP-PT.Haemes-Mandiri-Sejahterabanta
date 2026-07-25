import { db } from "@/lib/supabase/server";

interface ArmadaRow {
  id: number;
  tanggal: string;
  jumlah_tagihan: number;
  jumlah_uang_jalan: number;
  bersih: number;
}

interface PeriodeRow {
  id_periode: number;
}

interface CoaRow {
  id_coa: number;
}

export async function postArmadaToJurnal(id: number): Promise<void> {
  const { data: armada, error: armadaError } = await db
    .from("armada")
    .select("id, tanggal, jumlah_tagihan, jumlah_uang_jalan, bersih")
    .eq("id", id)
    .single<ArmadaRow>();

  if (armadaError || !armada) {
    throw new Error("Data armada tidak ditemukan");
  }

  const nominal = Number(armada.jumlah_tagihan);

  if (nominal <= 0) {
    throw new Error("Nominal tidak valid untuk posting");
  }

  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .single<PeriodeRow>();

  if (periodeError || !periode) {
    throw new Error("Periode OPEN tidak ditemukan");
  }

  const { data: coaKas, error: kasError } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "11010") // Kas Armada khusus
    .single<CoaRow>();

  if (kasError || !coaKas) {
    throw new Error("COA Kas Armada tidak ditemukan");
  }

  const { data: coaPendapatan, error: pendError } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "4000")
    .single<CoaRow>();

  if (pendError || !coaPendapatan) {
    throw new Error("COA Pendapatan tidak ditemukan");
  }

  const noBukti = `ARM-${armada.id}-${Date.now()}`;

  const { data: jurnal, error: jurnalError } = await db
    .from("jurnal")
    .insert({
      tanggal: armada.tanggal,
      no_bukti: noBukti,
      sumber: "ARMADA",
      keterangan: `Posting Armada ID ${armada.id}`,
      id_periode: periode.id_periode,
    })
    .select("id_jurnal")
    .single<{ id_jurnal: number }>();

  if (jurnalError || !jurnal) {
    throw new Error("Gagal membuat jurnal");
  }

  const totalDebit = nominal;
  const totalKredit = nominal;

  const { error: detailError } = await db.from("jurnal_detail").insert([
    {
      id_jurnal: jurnal.id_jurnal,
      id_coa: coaKas.id_coa,
      debit: totalDebit,
      kredit: 0,
      id_armada: armada.id,
    },
    {
      id_jurnal: jurnal.id_jurnal,
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: totalKredit,
      id_armada: armada.id,
    },
  ]);

  if (detailError) {
    throw new Error("Gagal membuat jurnal detail");
  }

  // ✅ AUTO COST CONTROL (dari uang jalan)
  const totalBeban = Number(armada.jumlah_uang_jalan);

  if (totalBeban > 0) {
    await db.from("cost_control_armada").insert({
      id_armada: armada.id,
      tanggal: armada.tanggal,
      jenis_biaya: "Biaya Operasional",
      nominal: totalBeban,
    });
  }
}
