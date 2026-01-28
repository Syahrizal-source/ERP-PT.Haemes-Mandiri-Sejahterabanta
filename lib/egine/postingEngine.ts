import { db } from "@/lib/supabase/server";
import { JenisTransaksi } from "@/lib/enums/jenisTransaksi";
import { Lokasi } from "@/lib/enums/lokasi";
import { hitungPajak } from "@/lib/utils/hitungPajak";

type PostingInput = {
  tanggal: string;
  no_bukti: string;
  jenis_transaksi: JenisTransaksi;
  nilai: number;
  lokasi: Lokasi;
  keterangan: string;
  id_periode: number;
};

export async function postingEngine(input: PostingInput) {
  /* =========================
     1. Ambil COA Mapping
  ========================= */
  const { data: mappings, error } = await db
    .from("coa_mapping_detail")
    .select("posisi, id_coa")
    .eq("jenis_transaksi", input.jenis_transaksi)
    .or(`lokasi.is.null,lokasi.eq.${input.lokasi}`);

  if (error || !mappings || mappings.length === 0) {
    throw new Error("COA mapping tidak ditemukan");
  }

  /* =========================
     2. Hitung Pajak
  ========================= */
  const pajak = hitungPajak(input.jenis_transaksi, input.nilai);

  /* =========================
     3. Insert Jurnal Header
  ========================= */
  const { data: jurnal } = await db
    .from("jurnal")
    .insert({
      tanggal: input.tanggal,
      no_bukti: input.no_bukti,
      sumber: "UMUM",
      keterangan: input.keterangan,
      id_periode: input.id_periode,
    })
    .select("id_jurnal")
    .single();

  if (!jurnal) throw new Error("Gagal membuat jurnal");

  /* =========================
     4. Detail Utama
  ========================= */
  const details = mappings.map((m) => ({
    id_jurnal: jurnal.id_jurnal,
    id_coa: m.id_coa,
    debit: m.posisi === "DEBIT" ? input.nilai : 0,
    kredit: m.posisi === "KREDIT" ? input.nilai : 0,
    id_proyek: null,
    id_alat: null,
    id_cost_center: null,
  }));

  /* =========================
     5. Detail Pajak
  ========================= */
  const pajakMap = [
    { nilai: pajak.ppn, coa: 21001 },
    { nilai: pajak.pph21, coa: 21002 },
    { nilai: pajak.pph23, coa: 21003 },
    { nilai: pajak.pphFinal, coa: 21004 },
  ];

  for (const p of pajakMap) {
    if (p.nilai > 0) {
      details.push({
        id_jurnal: jurnal.id_jurnal,
        id_coa: p.coa,
        debit: 0,
        kredit: p.nilai,
        id_proyek: null,
        id_alat: null,
        id_cost_center: null,
      });
    }
  }

  /* =========================
     6. Simpan Detail
  ========================= */
  await db.from("jurnal_detail").insert(details);

  return jurnal.id_jurnal;
}
