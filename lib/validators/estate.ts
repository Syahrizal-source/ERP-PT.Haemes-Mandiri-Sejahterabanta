import { z } from "zod";

/**
 * Anti minus helper
 * memastikan number >= 0 dan bukan NaN
 */
const nonNegativeNumber = (message: string) =>
  z.coerce.number().refine((v) => Number.isFinite(v) && v >= 0, message);

export const estateCreateSchema = z.object({
  region_id: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  total_area_ha: nonNegativeNumber("Total area tidak boleh minus"),
  manager_name: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const estateUpdateSchema = z.object({
  region_id: z.string().uuid().optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  total_area_ha: nonNegativeNumber("Luas tidak boleh minus").optional(),
  manager_name: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const estateIdParamSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

export type EstateCreateInput = z.infer<typeof estateCreateSchema>;
export type EstateUpdateInput = z.infer<typeof estateUpdateSchema>;
