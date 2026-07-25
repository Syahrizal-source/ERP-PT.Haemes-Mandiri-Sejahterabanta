import { z } from "zod";

export const HarvestSchema = z.object({
  block_id: z.string().uuid("Block tidak valid"),

  harvest_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Tanggal harvest tidak valid",
  }),

  total_bunches: z.coerce
    .number()
    .int()
    .min(0, "Jumlah janjang tidak boleh minus"),

  total_weight_kg: z.coerce.number().min(0, "Berat TBS tidak boleh minus"),

  total_loose_fruit_kg: z.coerce.number().min(0, "Brondolan tidak boleh minus"),

  notes: z.string().optional(),
});

export type HarvestInput = z.infer<typeof HarvestSchema>;
