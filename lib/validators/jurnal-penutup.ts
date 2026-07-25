import { z } from "zod";

export const jurnalPenutupSchema = z.object({
  id_periode: z.number().int().positive(),
  tanggal: z.string().min(1),
});

export type JurnalPenutupInput = z.infer<typeof jurnalPenutupSchema>;
