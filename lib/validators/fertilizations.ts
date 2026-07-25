import { z } from "zod";

export const fertilizationSchema = z.object({
  block_id: z.string().uuid("Block tidak valid"),

  item_id: z.string().uuid("Item tidak valid").nullable().optional(),

  vendor_name: z.string().max(100).optional(),

  fertilization_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "Tanggal tidak valid",
    }),

  dose_per_ha: z.coerce.number().min(0, "Dose tidak boleh minus").optional(),

  total_used: z.coerce.number().min(0, "Total tidak boleh minus").optional(),

  labor_cost: z.coerce.number().min(0, "Biaya tenaga kerja tidak boleh minus"),

  notes: z.string().optional(),
});

export const fertilizationUpdateSchema = fertilizationSchema.partial();

export type FertilizationInput = z.infer<typeof fertilizationSchema>;
