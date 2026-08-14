import { db } from "@/lib/supabase/server";

import { postJournal } from "./postJournal";
import { getCoaMappingDetail, KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";

import {
  proyekRealisasiSchema,
  type ProyekRealisasiRequest,
} from "@/lib/validators/proyekRealisasi";

export async function postProyekRealisasi(
  data: ProyekRealisasiRequest & {
    id_realisasi: string;
  },
): Promise<number> {
  // =====================================================
  // VALIDASI INPUT
  // =====================================================

  const payload = proyekRealisasiSchema.parse(data);

  const qty = Number(payload.qty);
  const harga = Number(payload.harga);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Qty realisasi harus lebih besar dari 0.");
  }

  if (!Number.isFinite(harga) || harga < 0) {
    throw new Error("Harga realisasi tidak valid.");
  }

  // =====================================================
  // PASTIKAN PROYEK ADA
  // =====================================================

  const { data: proyek, error: proyekError } = await db
    .from("proyek_master")
    .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")
    .eq("id", payload.id_proyek)
    .single();

  if (proyekError || !proyek) {
    throw new Error("Proyek tidak ditemukan.");
  }

  // =====================================================
  // PASTIKAN KATEGORI ADA
  // =====================================================

  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("id, kode, nama, jenis, aktif")
    .eq("id", payload.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori biaya proyek tidak ditemukan.");
  }

  if (!kategori.aktif) {
    throw new Error("Kategori biaya proyek sudah tidak aktif.");
  }

  if (!kategori.kode) {
    throw new Error("Kode kategori biaya proyek tidak ditemukan.");
  }

  // =====================================================
  // COA BIAYA
  // =====================================================

  const coaBiaya = await getCoaMappingDetail(
    "PROYEK",
    kategori.kode as KategoriCoa,
  );

  if (!coaBiaya?.id_coa) {
    throw new Error(`COA kategori ${kategori.kode} tidak ditemukan.`);
  }

  // =====================================================
  // TENTUKAN COA PEMBAYARAN
  // =====================================================

  const kategoriCoa: KategoriCoa =
    payload.metode_pembayaran === "KAS"
      ? "KAS"
      : payload.metode_pembayaran === "KAS_BESAR"
        ? "KAS_BESAR"
        : payload.metode_pembayaran === "KAS_KECIL"
          ? "KAS_KECIL"
          : payload.metode_pembayaran === "BANK"
            ? "BANK"
            : "HUTANG";

  // =====================================================
  // COA LAWAN
  // =====================================================

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  if (!coaLawan?.id_coa) {
    throw new Error(`COA pembayaran ${kategoriCoa} tidak ditemukan.`);
  }

  // =====================================================
  // HITUNG TOTAL
  // =====================================================

  const total = qty * harga;

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Total realisasi harus lebih besar dari 0.");
  }

  // =====================================================
  // JURNAL
  // =====================================================

  const lines: JurnalLine[] = [
    {
      id_coa: Number(coaBiaya.id_coa),
      debit: total,
      kredit: 0,
      id_proyek: payload.id_proyek,
    },
    {
      id_coa: Number(coaLawan.id_coa),
      debit: 0,
      kredit: total,
      id_proyek: payload.id_proyek,
    },
  ];

  // =====================================================
  // VALIDASI BALANCE
  // =====================================================

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nilai debit atau kredit jurnal tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Total debit dan kredit harus lebih besar dari 0.");
  }

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal realisasi proyek tidak balance.");
  }

  // =====================================================
  // POST JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: payload.tanggal,
    no_bukti: payload.no_bukti,
    keterangan: `Realisasi: ${payload.uraian.trim()}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_realisasi,
    id_proyek: payload.id_proyek,
    lines,
  });

  // =====================================================
  // UPDATE REALISASI
  // =====================================================

  const { error: updateError } = await db
    .from("proyek_realisasi")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_realisasi);

  if (updateError) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi realisasi gagal diperbarui: ${updateError.message}`,
    );
  }

  return idJurnal;
}
