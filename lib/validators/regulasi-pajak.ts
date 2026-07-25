import { z } from "zod";

/* =========================
   SCHEMA
========================= */
export const regulasiPajakSchema = z.object({
  kode_pajak: z.string().min(1),

  nama: z.string().min(1),

  tarif: z.number().min(0),

  tahun: z.number().int().min(2000),

  coa_beban: z.number().int().nullable(),

  coa_hutang: z.number().int().nullable(),

  berlaku_mulai: z.string().min(1),

  berlaku_sampai: z.string().nullable(),

  aktif: z.boolean().default(true),

  versi: z.number().int().min(1).default(1),
});

export type RegulasiPajakInput = z.infer<typeof regulasiPajakSchema>;

/* =========================
   NORMALIZE (ANTI MINUS)
========================= */
export function normalizeRegulasiPajak(
  input: RegulasiPajakInput,
): RegulasiPajakInput {
  return {
    ...input,
    tarif: Math.max(0, input.tarif),
    tahun: Math.max(2000, input.tahun),
    versi: Math.max(1, input.versi),
  };
}

/* =========================
   VALIDASI BISNIS
========================= */
export function validateRegulasiPajak(data: RegulasiPajakInput): void {
  /* =========================
     VALIDASI TARIF
  ========================= */
  if (data.tarif < 0) {
    throw new Error("Tarif tidak boleh minus");
  }

  if (data.tarif > 100) {
    throw new Error("Tarif tidak boleh lebih dari 100%");
  }

  /* =========================
     VALIDASI TANGGAL
  ========================= */
  const mulai = new Date(data.berlaku_mulai);

  if (Number.isNaN(mulai.getTime())) {
    throw new Error("Tanggal mulai tidak valid");
  }

  if (data.berlaku_sampai) {
    const sampai = new Date(data.berlaku_sampai);

    if (Number.isNaN(sampai.getTime())) {
      throw new Error("Tanggal selesai tidak valid");
    }

    if (sampai < mulai) {
      throw new Error("Tanggal selesai tidak boleh sebelum mulai");
    }
  }

  /* =========================
     VALIDASI COA
  ========================= */

  // Untuk PPN → tidak boleh ada beban
  if (data.kode_pajak === "PPN") {
    if (data.coa_beban !== null) {
      throw new Error("PPN tidak menggunakan COA beban");
    }
  }

  // Untuk PPh → wajib beban & hutang
  if (
    data.kode_pajak === "PPH23" ||
    data.kode_pajak === "PPH4" ||
    data.kode_pajak === "PPH25"
  ) {
    if (!data.coa_beban) {
      throw new Error("COA beban wajib diisi");
    }

    if (!data.coa_hutang) {
      throw new Error("COA hutang wajib diisi");
    }
  }
}

/* =========================
   HITUNG PAJAK (GENERIC)
========================= */
export type HitungPajakResult = {
  nilai_pajak: number;
  total: number;
};

export function hitungPajakDariRegulasi(
  nilai_dasar: number,
  tarif: number,
): HitungPajakResult {
  const dasar = Math.max(0, nilai_dasar);
  const tarifFix = Math.max(0, tarif);

  const nilai_pajak = (dasar * tarifFix) / 100;

  const nilaiFix = Math.max(0, nilai_pajak);

  const total = dasar + nilaiFix;

  return {
    nilai_pajak: nilaiFix,
    total,
  };
}
