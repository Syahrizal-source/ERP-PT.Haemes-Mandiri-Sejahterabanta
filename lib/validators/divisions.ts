import { z } from "zod";

export const divisionSchema = z.object({
  estate_id: z.string().uuid("Estate tidak valid"),

  code: z.string().min(1, "Kode wajib diisi").max(20, "Kode terlalu panjang"),

  name: z
    .string()
    .min(1, "Nama division wajib diisi")
    .max(100, "Nama terlalu panjang"),

  area_ha: z.coerce.number().min(0, "Luas tidak boleh negatif"),

  is_active: z.boolean().optional(),
});

export const divisionUpdateSchema = divisionSchema.partial();

export type DivisionInput = z.infer<typeof divisionSchema>;
export type DivisionUpdateInput = z.infer<typeof divisionUpdateSchema>;
