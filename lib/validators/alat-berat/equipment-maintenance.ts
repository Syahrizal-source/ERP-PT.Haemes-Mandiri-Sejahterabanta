import { z } from "zod";

export const equipmentMaintenanceCreateSchema = z.object({
  equipment_id: z.string().uuid(),

  tanggal: z.string(),

  jenis: z.string().nullable().optional(),

  vendor_id: z.number().int().nullable().optional(),

  hm_service: z.number().nonnegative().nullable().optional(),

  biaya: z.number().nonnegative().nullable().optional(),

  id_jurnal: z.number().int().nullable().optional(),

  keterangan: z.string().nullable().optional(),
});

export const equipmentMaintenanceUpdateSchema = z.object({
  equipment_id: z.string().uuid().optional(),
  tanggal: z.string().optional(),
  jenis: z.string().nullable().optional(),
  vendor_id: z.number().int().nullable().optional(),
  hm_service: z.number().nonnegative().nullable().optional(),
  biaya: z.number().nonnegative().nullable().optional(),
  id_jurnal: z.number().int().nullable().optional(),
  keterangan: z.string().nullable().optional(),
});

export const equipmentMaintenanceIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentMaintenanceCreateInput = z.infer<
  typeof equipmentMaintenanceCreateSchema
>;

export type EquipmentMaintenanceUpdateInput = z.infer<
  typeof equipmentMaintenanceUpdateSchema
>;

export type EquipmentMaintenanceIdInput = z.infer<
  typeof equipmentMaintenanceIdSchema
>;
