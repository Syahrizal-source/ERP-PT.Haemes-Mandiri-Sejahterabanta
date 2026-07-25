import { z } from "zod";

export const PestControlSchema = z.object({
  block_id: z.string().uuid(),
  control_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid"),
  pest_type: z.string().min(1, "Jenis hama wajib diisi"),
  severity_level: z.string().optional(),
  action_taken: z.string().optional(),
  chemical_used: z.string().optional(),
  cost: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export const PestControlUpdateSchema = PestControlSchema.partial();

export type PestControlInput = z.infer<typeof PestControlSchema>;
export type PestControlUpdateInput = z.infer<typeof PestControlUpdateSchema>;
