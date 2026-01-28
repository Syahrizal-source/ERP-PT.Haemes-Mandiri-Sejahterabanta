import { z } from "zod";

export const jurnalPenyesuaianDetailSchema = z.object({
  id_coa: z.number().int().positive(),
  debit: z.number(),
  kredit: z.number(),
  id_alat: z.number().int().nullable().optional(),
});

export const jurnalPenyesuaianSchema = z.object({
  tanggal: z.string().min(1),
  no_bukti: z.string().min(1),
  keterangan: z.string().min(1),
  id_periode: z.number().int().positive(),
  details: z
    .array(jurnalPenyesuaianDetailSchema)
    .min(1, "Detail jurnal wajib diisi"),
});
