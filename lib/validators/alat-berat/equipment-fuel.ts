import { z } from "zod";

export const equipmentFuelCreateSchema = z.object({
  equipment_id: z.string().uuid(),

  tanggal: z.string(),

  liter: z.number().positive(),

  harga: z.number().nonnegative(),

  supplier: z.string().nullable().optional(),

  id_jurnal: z.number().int().nullable().optional(),
});

export const equipmentFuelUpdateSchema = z
  .object({
    equipment_id: z.string().uuid().optional(),
    tanggal: z.string().optional(),
    liter: z.number().positive().optional(),
    harga: z.number().nonnegative().optional(),
    supplier: z.string().nullable().optional(),
    id_jurnal: z.number().int().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.liter !== undefined && data.harga !== undefined) {
        return data.liter > 0 && data.harga >= 0;
      }
      return true;
    },
    {
      message: "Liter dan harga tidak valid",
      path: ["liter"],
    },
  );

export const equipmentFuelIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentFuelCreateInput = z.infer<
  typeof equipmentFuelCreateSchema
>;

export type EquipmentFuelUpdateInput = z.infer<
  typeof equipmentFuelUpdateSchema
>;

export type EquipmentFuelIdInput = z.infer<typeof equipmentFuelIdSchema>;
