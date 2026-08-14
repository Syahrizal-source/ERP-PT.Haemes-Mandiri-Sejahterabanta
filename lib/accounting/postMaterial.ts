import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";
import {
  proyekMaterialSchema,
  type ProyekMaterialRequest,
} from "@/lib/validators/proyekMaterial";

type MetodePembayaranMaterial =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

export async function postMaterial(
  data: ProyekMaterialRequest & {
    id_material: string;
  },
): Promise<number> {
  // =====================================================
  // VALIDASI INPUT
  // =====================================================

  const payload = proyekMaterialSchema.parse(data);

  const qty = Number(payload.qty);
  const harga = Number(payload.harga);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Qty material harus lebih besar dari 0.");
  }

  if (!Number.isFinite(harga) || harga <= 0) {
    throw new Error("Harga material harus lebih besar dari 0.");
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
  // PASTIKAN COA MATERIAL TERDAFTAR
  // =====================================================

  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("id, kode, nama, aktif")
    .eq("id", payload.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori material tidak ditemukan.");
  }

  if (!kategori.aktif) {
    throw new Error("Kategori material sudah tidak aktif.");
  }

  if (!kategori.kode) {
    throw new Error("Kode kategori material tidak ditemukan.");
  }

  const coaMaterial = await getCoaMappingDetail(
    "PROYEK",
    kategori.kode as Parameters<typeof getCoaMappingDetail>[1],
  );

  // =====================================================
  // TENTUKAN COA LAWAN
  // =====================================================

  let coaLawanId: number;

  if (payload.metode_pembayaran === "KAS_BESAR") {
    coaLawanId = 2629;
  } else if (payload.metode_pembayaran === "KAS_KECIL") {
    coaLawanId = 2630;
  } else {
    const kategoriCoa =
      payload.metode_pembayaran === "BANK"
        ? "BANK"
        : payload.metode_pembayaran === "HUTANG"
          ? "HUTANG"
          : "KAS";

    const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

    coaLawanId = Number(coaLawan.id_coa);
  }

  // =====================================================
  // VALIDASI COA LAWAN TERDAFTAR PADA PROYEK
  // =====================================================

  const { data: proyekCoa, error: proyekCoaError } = await db
    .from("proyek_coa")
    .select("id_coa")
    .eq("id_proyek", payload.id_proyek)
    .eq("aktif", true)
    .eq("id_coa", coaLawanId)
    .maybeSingle();

  if (proyekCoaError) {
    throw new Error(`Gagal memeriksa COA proyek: ${proyekCoaError.message}`);
  }

  if (!proyekCoa) {
    throw new Error(
      `COA ${coaLawanId} belum terdaftar pada proyek ${proyek.kode_proyek}.`,
    );
  }

  // =====================================================
  // HITUNG TOTAL
  // =====================================================

  const total = qty * harga;

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Total material tidak valid.");
  }

  // =====================================================
  // JURNAL
  // =====================================================

  const lines: JurnalLine[] = [
    {
      id_coa: Number(coaMaterial.id_coa),
      debit: total,
      kredit: 0,
      id_proyek: payload.id_proyek,
    },
    {
      id_coa: coaLawanId,
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

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal material tidak balance.");
  }

  // =====================================================
  // POST JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: payload.tanggal,
    no_bukti: payload.no_bukti,
    keterangan: `Material: ${payload.keterangan?.trim() || "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: data.id_material,
    id_proyek: payload.id_proyek,
    lines,
  });

  // =====================================================
  // UPDATE MATERIAL
  // =====================================================

  const { error: updateError } = await db
    .from("proyek_material")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", data.id_material);

  if (updateError) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi material gagal diperbarui: ${updateError.message}`,
    );
  }

  return idJurnal;
}
