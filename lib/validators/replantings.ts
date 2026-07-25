import { z } from "zod";

export const replantingCreateSchema = z.object({
  block_id: z.string().uuid("Block tidak valid"),

  tanggal: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal tidak valid"),

  pokok_ditebang: z.coerce
    .number()
    .int()
    .min(0, "Pokok ditebang tidak boleh minus"),

  pokok_ditanam: z.coerce
    .number()
    .int()
    .min(0, "Pokok ditanam tidak boleh minus"),

  biaya_total: z.coerce.number().min(0, "Biaya tidak boleh minus"),

  keterangan: z.string().max(500).optional(),
});

export const replantingUpdateSchema = replantingCreateSchema.partial();

export const replantingParamSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

export type ReplantingCreateInput = z.infer<typeof replantingCreateSchema>;
export type ReplantingUpdateInput = z.infer<typeof replantingUpdateSchema>;
