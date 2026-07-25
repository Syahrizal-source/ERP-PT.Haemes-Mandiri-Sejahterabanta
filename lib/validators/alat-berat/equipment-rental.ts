import { z } from "zod";

const nonNegativeNumber = z.number().finite().min(0);

export const equipmentRentalCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),

    tanggal: z.string(),

    id_proyek: z.string().uuid().nullable().optional(),

    customer: z.string().nullable().optional(),

    jam: nonNegativeNumber.optional(),

    harga_jam: nonNegativeNumber.optional(),

    subtotal: nonNegativeNumber.optional(),

    ppn: nonNegativeNumber.optional(),

    pph23: nonNegativeNumber.optional(),

    total: nonNegativeNumber.optional(),

    id_jurnal: z.number().int().nullable().optional(),
  })
  .refine(
    (data) => {
      if (
        data.jam !== undefined &&
        data.harga_jam !== undefined &&
        data.subtotal !== undefined
      ) {
        return data.subtotal === data.jam * data.harga_jam;
      }
      return true;
    },
    {
      message: "Subtotal tidak sesuai rumus",
      path: ["subtotal"],
    },
  );

export const equipmentRentalUpdateSchema = z.object({
  equipment_id: z.string().uuid().optional(),
  tanggal: z.string().optional(),
  id_proyek: z.string().uuid().nullable().optional(),
  customer: z.string().nullable().optional(),
  jam: z.number().finite().min(0).optional(),
  harga_jam: z.number().finite().min(0).optional(),
  subtotal: z.number().finite().min(0).optional(),
  ppn: z.number().finite().min(0).optional(),
  pph23: z.number().finite().min(0).optional(),
  total: z.number().finite().min(0).optional(),
  id_jurnal: z.number().int().nullable().optional(),
});

export const equipmentRentalIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentRentalCreateInput = z.infer<
  typeof equipmentRentalCreateSchema
>;

export type EquipmentRentalUpdateInput = z.infer<
  typeof equipmentRentalUpdateSchema
>;

export type EquipmentRentalIdInput = z.infer<typeof equipmentRentalIdSchema>;
