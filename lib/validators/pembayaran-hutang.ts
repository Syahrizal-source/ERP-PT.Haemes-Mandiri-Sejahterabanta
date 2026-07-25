import { z } from "zod";

export const pembayaranHutangSchema = z.object({
  tanggal: z.string().min(1),
  id_hutang: z.number().int().positive(),
  nominal: z.number().positive(),
  keterangan: z.string().min(1),
});

export type PembayaranHutangInput = z.infer<typeof pembayaranHutangSchema>;
