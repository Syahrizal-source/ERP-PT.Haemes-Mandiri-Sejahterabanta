import { z } from "zod";

/* =========================
   SCHEMA
========================= */

export const pph23Schema = z.object({
  id_vendor: z.number().int().positive("Vendor wajib dipilih"),

  jenis_jasa: z.string().min(1, "Jenis jasa wajib diisi"),

  nilai_transaksi: z.number().positive("Nilai transaksi harus lebih dari 0"),

  tarif_pph23: z.number().min(0, "Tarif tidak boleh minus"),

  pph23_terutang: z.number().min(0, "PPh23 tidak boleh minus"),

  tanggal_transaksi: z.string().min(1, "Tanggal wajib diisi"),
});

/* =========================
   TYPE
========================= */

export type Pph23Input = z.infer<typeof pph23Schema>;

/* =========================
   HELPER HITUNG PPH23
========================= */

export function hitungPph23(input: Pph23Input): number {
  /* =========================
     DASAR PAJAK
  ========================= */

  const dasar: number = Math.max(0, input.nilai_transaksi);

  /* =========================
     HITUNG PAJAK
  ========================= */

  const pajak: number = dasar * (input.tarif_pph23 / 100);

  /* =========================
     ANTI MINUS
  ========================= */

  return Math.max(0, pajak);
}
