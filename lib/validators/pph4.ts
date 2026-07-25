import { z } from "zod";

/* =========================
   SCHEMA
========================= */

export const pph4Schema = z.object({
  id_vendor: z.number().int().positive("Vendor wajib dipilih"),

  jenis_objek: z.string().min(1, "Jenis objek wajib diisi"),

  // ===== FIELD BARU =====

  npwp_pembeli: z.string().optional(),

  nama_pembeli: z.string().optional(),

  nomor_faktur_pajak: z.string().optional(),

  tanggal_faktur_pajak: z.string().optional(),

  dpp_nilai_lain: z.number().min(0).optional(),

  potongan: z.number().min(0).optional(),

  // ===== FIELD LAMA =====

  nilai_transaksi: z.number().min(0, "Nilai transaksi tidak boleh minus"),

  tarif_pph4: z.number().min(0, "Tarif tidak boleh minus"),

  pph4_terutang: z.number().min(0, "PPh4 tidak boleh minus"),

  tanggal_transaksi: z.string().min(1, "Tanggal wajib diisi"),
});

/* =========================
   TYPE
========================= */

export type Pph4Input = z.infer<typeof pph4Schema>;

/* =========================
   HELPER HITUNG PPH4
========================= */

export function hitungPph4(input: Pph4Input): number {
  /* =========================
     DASAR PAJAK
  ========================= */

  const dasar = Math.max(0, input.nilai_transaksi - (input.potongan ?? 0));

  /* =========================
     HITUNG PAJAK
  ========================= */

  const pajak: number = dasar * (input.tarif_pph4 / 100);

  /* =========================
     ANTI MINUS
  ========================= */

  return Math.max(0, pajak);
}
