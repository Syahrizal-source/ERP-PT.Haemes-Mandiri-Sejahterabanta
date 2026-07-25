import { z } from "zod";

export const equipmentMutationCreateSchema = z.object({
  equipment_id: z.string().uuid(),

  tanggal: z.string().nullable().optional(),

  dari_lokasi: z.string().trim().nullable().optional(),

  ke_lokasi: z.string().trim().nullable().optional(),

  id_proyek: z.string().uuid().nullable().optional(),
});

export const equipmentMutationUpdateSchema = z.object({
  id: z.string().uuid(),

  equipment_id: z.string().uuid().optional(),

  tanggal: z.string().nullable().optional(),

  dari_lokasi: z.string().trim().nullable().optional(),

  ke_lokasi: z.string().trim().nullable().optional(),

  id_proyek: z.string().uuid().nullable().optional(),
});

export const equipmentMutationIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentMutationCreateInput = z.infer<
  typeof equipmentMutationCreateSchema
>;

export type EquipmentMutationUpdateInput = z.infer<
  typeof equipmentMutationUpdateSchema
>;

export type EquipmentMutationIdInput = z.infer<
  typeof equipmentMutationIdSchema
>;
