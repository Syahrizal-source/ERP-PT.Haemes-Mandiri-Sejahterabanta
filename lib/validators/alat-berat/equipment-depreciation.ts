import { z } from "zod";

const nonNegativeNumber = z.number().finite().min(0);

export const equipmentDepreciationCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),

    tanggal: z.string(),

    nilai: nonNegativeNumber,

    id_jurnal: z.number().int().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.nilai < 0) {
        return false;
      }

      return true;
    },
    {
      message: "NILAI_TIDAK_BOLEH_MINUS",
      path: ["nilai"],
    },
  );

export const equipmentDepreciationUpdateSchema = z
  .object({
    equipment_id: z.string().uuid().optional(),
    tanggal: z.string().optional(),
    nilai: nonNegativeNumber.optional(),
    id_jurnal: z.number().int().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.nilai !== undefined) {
        return data.nilai >= 0;
      }
      return true;
    },
    {
      message: "Nilai tidak boleh minus",
      path: ["nilai"],
    },
  );

export const equipmentDepreciationIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentDepreciationCreateInput = z.infer<
  typeof equipmentDepreciationCreateSchema
>;

export type EquipmentDepreciationUpdateInput = z.infer<
  typeof equipmentDepreciationUpdateSchema
>;

export type EquipmentDepreciationIdInput = z.infer<
  typeof equipmentDepreciationIdSchema
>;
