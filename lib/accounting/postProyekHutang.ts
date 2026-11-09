import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";
import {
  proyekHutangSchema,
  ProyekHutangRequest,
} from "@/lib/validators/proyekHutang";

export async function postProyekHutang(
  data: ProyekHutangRequest & {
    id_hutang: string;
    no_bukti: string;
  },
): Promise<number> {
  const validated = proyekHutangSchema.parse(data);

  // ============================================================
  // AMBIL KODE KATEGORI BIAYA PROYEK
  // ============================================================

  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("id, kode, nama, jenis, aktif")
    .eq("id", validated.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori biaya proyek tidak ditemukan.");
  }

  if (!kategori.aktif) {
    throw new Error(`Kategori ${kategori.kode} tidak aktif.`);
  }

  const kategoriCoa = kategori.kode as KategoriCoa;

  // ============================================================
  // COA DEBIT
  //
  // PROYEK + KODE KATEGORI
  // ============================================================

  const coaBiaya = await getCoaMappingDetail("PROYEK", kategoriCoa);

  // ============================================================
  // COA KREDIT
  //
  // PROYEK + HUTANG
  // ============================================================

  const coaHutang = await getCoaMappingDetail("PROYEK", "HUTANG");

  const total = Number(validated.nilai);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Nilai hutang harus lebih besar dari 0.");
  }

  // ============================================================
  // JURNAL
  // ============================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaBiaya.id_coa,
      debit: total,
      kredit: 0,
      id_proyek: validated.id_proyek,
    },
    {
      id_coa: coaHutang.id_coa,
      debit: 0,
      kredit: total,
      id_proyek: validated.id_proyek,
    },
  ];

  const idJurnal = await postJournal({
    tanggal: validated.tanggal ?? (() => { throw new Error("Tanggal hutang wajib diisi."); })(),
    no_bukti: data.no_bukti,
    keterangan: validated.keterangan ?? `Hutang Proyek - ${validated.supplier}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_hutang,
    id_proyek: validated.id_proyek,
    lines,
  });

  return idJurnal;
}
