import { z } from "zod";

/**
 * Anti minus & anti NaN helper
 */
const nonEmptyString = (message: string) => z.string().min(1, message);

export const regionCreateSchema = z.object({
  province_id: z.string().uuid("Province ID tidak valid"),
  name: nonEmptyString("Nama region wajib diisi").max(100),
});

export const regionUpdateSchema = z.object({
  province_id: z.string().uuid("Province ID tidak valid").optional(),
  name: nonEmptyString("Nama region wajib diisi").max(100).optional(),
});

export const regionIdParamSchema = z.object({
  id: z.string().uuid("ID region tidak valid"),
});

export type RegionCreateInput = z.infer<typeof regionCreateSchema>;
export type RegionUpdateInput = z.infer<typeof regionUpdateSchema>;
