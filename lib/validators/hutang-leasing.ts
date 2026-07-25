import { z } from "zod";

import type { HutangLeasingInput, LeasingCalculation } from "@/types/leasing";

/* =========================
   SCHEMA
========================= */

export const hutangLeasingSchema = z.object({
  tanggal: z.string(),

  no_kontrak: z.string().min(1),

  nama_pt_leasing: z.string().min(1),

  keterangan_unit: z.string().min(1),

  jumlah_unit: z.number().min(1),

  uang_muka: z.number().min(0),

  hutang_pokok: z.number().min(0),

  persentase_bunga: z.number().min(0),

  bunga: z.number().min(0),

  hutang_pembiayaan: z.number().min(0),

  tenor_bulan: z.number().min(1),

  angsuran_perbulan: z.number().min(0),

  tanggal_mulai: z.string(),

  tanggal_selesai: z.string(),

  bulan_terbayar: z.number().min(0),

  total_sudah_dibayar: z.number().min(0),

  angsuran_tahun_berjalan: z.number().min(0),

  tanggal_pembayaran: z.number().min(1).max(31),

  sisa_hutang: z.number().min(0),

  sisa_bulan: z.number().min(0),

  hutang_jangka_pendek: z.number().min(0),

  hutang_jangka_panjang: z.number().min(0),

  status: z.enum(["OPEN", "ACTIVE", "LUNAS", "CLOSED"]),
});

/* =========================
   NORMALIZE
========================= */

export function normalizeHutangLeasing(
  input: HutangLeasingInput,
): HutangLeasingInput {
  return {
    ...input,

    jumlah_unit: Number(input.jumlah_unit ?? 0),

    uang_muka: Number(input.uang_muka ?? 0),

    hutang_pokok: Number(input.hutang_pokok ?? 0),

    persentase_bunga: Number(input.persentase_bunga ?? 0),

    bunga: Number(input.bunga ?? 0),

    hutang_pembiayaan: Number(input.hutang_pembiayaan ?? 0),

    tenor_bulan: Number(input.tenor_bulan ?? 0),

    angsuran_perbulan: Number(input.angsuran_perbulan ?? 0),

    bulan_terbayar: Number(input.bulan_terbayar ?? 0),

    total_sudah_dibayar: Number(input.total_sudah_dibayar ?? 0),

    angsuran_tahun_berjalan: Number(input.angsuran_tahun_berjalan ?? 0),

    tanggal_pembayaran: Number(input.tanggal_pembayaran ?? 0),

    sisa_hutang: Number(input.sisa_hutang ?? 0),

    sisa_bulan: Number(input.sisa_bulan ?? 0),

    hutang_jangka_pendek: Number(input.hutang_jangka_pendek ?? 0),

    hutang_jangka_panjang: Number(input.hutang_jangka_panjang ?? 0),
  };
}

/* =========================
   HITUNG LEASING
========================= */

export function hitungLeasing(input: HutangLeasingInput): LeasingCalculation {
  const totalPembiayaan = input.hutang_pokok;

  const totalBunga = input.bunga;

  const totalKewajiban = totalPembiayaan + totalBunga;

  const angsuranPerBulan =
    input.tenor_bulan > 0 ? totalKewajiban / input.tenor_bulan : 0;

  const sisaHutang = totalKewajiban - input.total_sudah_dibayar;

  const sisaJangkaPendek = Math.min(angsuranPerBulan * 12, sisaHutang);

  const sisaJangkaPanjang = sisaHutang - sisaJangkaPendek;

  return {
    totalPembiayaan,

    totalBunga,

    totalKewajiban,

    angsuranPerBulan,

    sisaHutang,

    sisaJangkaPendek,

    sisaJangkaPanjang,
  };
}

/* =========================
   VALIDASI BUSINESS
========================= */

export function validateLeasing(input: HutangLeasingInput): void {
  if (input.hutang_pokok <= 0) {
    throw new Error("Hutang pokok wajib lebih besar dari 0");
  }

  if (input.tenor_bulan <= 0) {
    throw new Error("Tenor leasing tidak valid");
  }

  if (input.sisa_hutang < 0) {
    throw new Error("Sisa hutang tidak valid");
  }
}
