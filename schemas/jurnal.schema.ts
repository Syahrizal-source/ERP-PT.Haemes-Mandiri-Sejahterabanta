import { z } from "zod";

export const JurnalDetailSchema = z.object({
  id_coa: z.number().int().positive(),
  debit: z.number().nonnegative(),
  kredit: z.number().nonnegative(),
});

export const JurnalSchema = z.object({
  tanggal: z.string().min(10),
  no_bukti: z.string().min(3),
  sumber: z.enum(["UMUM", "PENYESUAIAN"]),
  keterangan: z.string().min(3),
  id_periode: z.number().int().positive(),
  details: z.array(JurnalDetailSchema).min(2),
});

export type JurnalInput = z.infer<typeof JurnalSchema>;
