import { z } from "zod";

export const pph23Schema = z.object({
  id_vendor: z.number().int().positive(),
  jenis_jasa: z.string().min(1),
  nilai_transaksi: z.number().positive(),
  tarif_pph23: z.number().min(0),
  tanggal_transaksi: z.string().min(10),
});

export type PPH23Input = z.infer<typeof pph23Schema>;
