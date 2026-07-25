import { z } from "zod";

export const equipmentOperationCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),

    tanggal: z.string(),

    id_operator: z.string().uuid().nullable().optional(),

    id_proyek: z.string().uuid().nullable().optional(),

    hm_awal: z.number().nonnegative().optional(),

    hm_akhir: z.number().nonnegative().optional(),

    total_jam: z.number().nonnegative().optional(),

    keterangan: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.hm_awal !== undefined && data.hm_akhir !== undefined) {
        return data.hm_akhir >= data.hm_awal;
      }
      return true;
    },
    {
      message: "HM_AKHIR_TIDAK_BOLEH_LEBIH_KECIL_DARI_HM_AWAL",
      path: ["hm_akhir"],
    },
  );

export const equipmentOperationUpdateSchema = z.object({
  id: z.string().uuid(),

  equipment_id: z.string().uuid().optional(),

  tanggal: z.string().optional(),

  id_operator: z.string().uuid().nullable().optional(),

  id_proyek: z.string().uuid().nullable().optional(),

  hm_awal: z.number().nonnegative().optional(),

  hm_akhir: z.number().nonnegative().optional(),

  total_jam: z.number().nonnegative().optional(),

  keterangan: z.string().nullable().optional(),
});

export const equipmentOperationIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentOperationCreateInput = z.infer<
  typeof equipmentOperationCreateSchema
>;

export type EquipmentOperationUpdateInput = z.infer<
  typeof equipmentOperationUpdateSchema
>;

export type EquipmentOperationIdInput = z.infer<
  typeof equipmentOperationIdSchema
>;
