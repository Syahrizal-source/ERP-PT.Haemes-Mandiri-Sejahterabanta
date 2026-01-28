import { z } from "zod";

export const ppnSchema = z.object({
  id_transaksi: z.number().int().positive(),
  jenis_ppn: z.enum(["keluaran", "masukan"]),
  nilai_dasar: z.number().positive(),
  tarif_ppn: z.number().min(0),
  tanggal_transaksi: z.string().min(10),
});

export type PPNInput = z.infer<typeof ppnSchema>;
