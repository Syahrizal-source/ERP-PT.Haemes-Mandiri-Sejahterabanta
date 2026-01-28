import { z } from "zod";

export const pendapatanSchema = z.object({
  tanggal: z.string().min(10),

  id_coa: z.number().int().positive(),

  nominal: z.number().positive(),

  keterangan: z.string().min(1),
});

export type PendapatanInput = z.infer<typeof pendapatanSchema>;
