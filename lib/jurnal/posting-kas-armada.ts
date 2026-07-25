import { db } from "@/lib/supabase/server";

interface KasArmadaRow {
  id: number;
  tanggal: string;
  penerimaan: number;
  pengembalian: number;
  pengeluaran: number;
  kasbon: number;
}

interface PeriodeRow {
  id_periode: number;
}

interface CoaRow {
  id_coa: number;
}

interface JurnalInsert {
  id_jurnal: number;
}

export async function postKasArmadaToJurnal(id: number): Promise<void> {
  const { data: kas, error: kasError } = await db
    .from("kas_armada")
    .select("id, tanggal, penerimaan, pengembalian, pengeluaran, kasbon")
    .eq("id", id)
    .single<KasArmadaRow>();

  if (kasError || !kas) {
    throw new Error("Data kas-armada tidak ditemukan");
  }

  const totalMasuk = Number(kas.penerimaan) + Number(kas.pengembalian);

  const totalKeluar = Number(kas.pengeluaran) + Number(kas.kasbon);

  if (totalMasuk === 0 && totalKeluar === 0) {
    throw new Error("Nominal kosong");
  }

  const { data: periode } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .single<PeriodeRow>();

  if (!periode) {
    throw new Error("Periode OPEN tidak ditemukan");
  }

  // 🔥 FIXED COA BY KODE (BUKAN TIPE)
  const { data: coaKas } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "11010")
    .single<CoaRow>();

  const { data: coaPendapatan } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "41101")
    .single<CoaRow>();

  const { data: coaBeban } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "61101")
    .single<CoaRow>();

  if (!coaKas || !coaPendapatan || !coaBeban) {
    throw new Error("COA tidak lengkap (11010 / 41101 / 61101)");
  }

  const { data: jurnal } = await db
    .from("jurnal")
    .insert({
      tanggal: kas.tanggal,
      no_bukti: `KAS-${kas.id}-${Date.now()}`,
      sumber: "KAS_ARMADA",
      keterangan: `Posting Kas Armada ID ${kas.id}`,
      id_periode: periode.id_periode,
    })
    .select("id_jurnal")
    .single<JurnalInsert>();

  if (!jurnal) {
    throw new Error("Gagal buat jurnal");
  }

  const detailRows: {
    id_jurnal: number;
    id_coa: number;
    debit: number;
    kredit: number;
    id_kas_armada: number;
  }[] = [];

  if (totalMasuk > 0) {
    detailRows.push(
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: coaKas.id_coa,
        debit: totalMasuk,
        kredit: 0,
        id_kas_armada: kas.id,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: coaPendapatan.id_coa,
        debit: 0,
        kredit: totalMasuk,
        id_kas_armada: kas.id,
      },
    );
  }

  if (totalKeluar > 0) {
    detailRows.push(
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: coaBeban.id_coa,
        debit: totalKeluar,
        kredit: 0,
        id_kas_armada: kas.id,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: totalKeluar,
        id_kas_armada: kas.id,
      },
    );
  }

  const { error: detailError } = await db
    .from("jurnal_detail")
    .insert(detailRows);

  if (detailError) {
    throw new Error(`Insert jurnal_detail gagal: ${detailError.message}`);
  }
}
