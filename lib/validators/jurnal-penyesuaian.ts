import { z } from "zod";

export const jurnalPenyesuaianSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  id_periode: z.number().int().positive(),
  keterangan: z.string().min(3),
  details: z
    .array(
      z.object({
        id_coa: z.number().int().positive(),
        debit: z.number().nonnegative(),
        kredit: z.number().nonnegative(),
      }),
    )
    .min(2),
});