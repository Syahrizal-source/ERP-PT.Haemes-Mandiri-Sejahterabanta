import { z } from "zod";

export const partCreateSchema = z.object({
  part_name: z.string().min(1, "Nama part wajib diisi"),
  part_number: z.string().nullable().optional(),
  stock: z.number().nonnegative(),
});

export const partUpdateSchema = partCreateSchema.partial();
