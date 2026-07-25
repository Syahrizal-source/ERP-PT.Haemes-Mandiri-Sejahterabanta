import { z } from "zod";

/* =========================
   SCHEMA
========================= */

export const pph25Schema = z.object({
  tahun: z.number().int().min(2000, "Tahun tidak valid"),

  bulan: z
    .number()
    .int()
    .min(1, "Bulan minimal 1")
    .max(12, "Bulan maksimal 12"),

  nilai_angsuran: z.number().min(0, "Nilai angsuran tidak boleh minus"),

  tanggal_setor: z.string().optional().or(z.literal("")),

  tanggal_transaksi: z.string().min(1, "Tanggal transaksi wajib diisi"),

  keterangan: z.string().optional().or(z.literal("")),
});

/* =========================
   TYPE
========================= */

export type Pph25Input = z.infer<typeof pph25Schema>;

/* =========================
   HELPER HITUNG PPH25
========================= */

export function hitungPph25(input: Pph25Input): number {
  /* =========================
     DASAR (ANTI MINUS)
  ========================= */

  const dasar: number = Math.max(0, input.nilai_angsuran);

  /* =========================
     PPH25 = ANGSURAN LANGSUNG
     (tidak pakai tarif seperti PPh21/23/4)
  ========================= */

  const pajak: number = dasar;

  /* =========================
     FINAL ANTI MINUS
  ========================= */

  return Math.max(0, pajak);
}
