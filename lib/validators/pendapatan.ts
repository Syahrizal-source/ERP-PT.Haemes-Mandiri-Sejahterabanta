import { z } from "zod";

export const pendapatanSchema = z.object({
  tanggal: z.string(),
  id_coa: z.number(),
  nominal: z.number().positive(),
  keterangan: z.string(),
});

export type PendapatanInput = z.infer<typeof pendapatanSchema>;