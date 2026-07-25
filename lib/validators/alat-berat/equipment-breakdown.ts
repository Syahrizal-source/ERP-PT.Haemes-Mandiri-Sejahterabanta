import { z } from "zod";

const nonNegativeNumber = z.number().finite().min(0);

export const equipmentBreakdownCreateSchema = z.object({
  equipment_id: z.string().uuid(),

  tanggal_mulai: z.string(),

  tanggal_selesai: z.string().nullable().optional(),

  penyebab: z.string().trim().nullable().optional(),

  tindakan: z.string().trim().nullable().optional(),

  durasi_jam: nonNegativeNumber.optional(),

  id_operator: z.string().uuid().nullable().optional(),

  id_proyek: z.string().uuid().nullable().optional(),
});

export const equipmentBreakdownUpdateSchema = z.object({
  id: z.string().uuid(),

  equipment_id: z.string().uuid().optional(),

  tanggal_mulai: z.string().optional(),

  tanggal_selesai: z.string().nullable().optional(),

  penyebab: z.string().trim().nullable().optional(),

  tindakan: z.string().trim().nullable().optional(),

  durasi_jam: nonNegativeNumber.optional(),

  id_operator: z.string().uuid().nullable().optional(),

  id_proyek: z.string().uuid().nullable().optional(),
});

export const equipmentBreakdownIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentBreakdownCreateInput = z.infer<
  typeof equipmentBreakdownCreateSchema
>;

export type EquipmentBreakdownUpdateInput = z.infer<
  typeof equipmentBreakdownUpdateSchema
>;

export type EquipmentBreakdownIdInput = z.infer<
  typeof equipmentBreakdownIdSchema
>;
