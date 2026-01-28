import { z } from "zod";

export const pph21Schema = z.object({
  id_payroll: z.number().int().positive(),
  nama: z.string().min(1),
  gaji_bruto: z.number().positive(),
  biaya_jabatan: z.number().nonnegative(),
  iuran: z.number().nonnegative(),
  tarif_pph21: z.number().min(0),
  tanggal: z.string().min(10),
});

export type PPH21Input = z.infer<typeof pph21Schema>;
