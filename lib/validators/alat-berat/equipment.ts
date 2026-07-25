import { z } from "zod";

/*
STATUS ENUM
sesuai dengan database
*/
export const equipmentStatusEnum = z.enum(["ACTIVE", "STANDBY", "BREAKDOWN"]);

/*
CREATE EQUIPMENT
dipakai untuk POST API
*/
export const equipmentCreateSchema = z.object({
  asset_number: z.string().min(1, "asset_number wajib diisi"),

  type: z.string().min(1, "type wajib diisi"),

  brand: z.string().min(1, "brand wajib diisi"),

  model: z.string().nullable().optional(),

  serial_number: z.string().nullable().optional(),

  year: z.number().int().min(1980).max(new Date().getFullYear()).optional(),

  site_id: z.string().uuid().nullable().optional(),

  status: equipmentStatusEnum.optional(),
});

/*
UPDATE EQUIPMENT
dipakai untuk PUT / PATCH
*/
export const equipmentUpdateSchema = z.object({
  id: z.string().uuid(),

  asset_number: z.string().min(1).optional(),

  type: z.string().min(1).optional(),

  brand: z.string().min(1).optional(),

  model: z.string().nullable().optional(),

  serial_number: z.string().nullable().optional(),

  year: z.number().int().min(1980).max(new Date().getFullYear()).optional(),

  site_id: z.string().uuid().nullable().optional(),

  status: equipmentStatusEnum.optional(),
});

/*
PARAM ID
dipakai untuk route /api/equipment/[id]
*/
export const equipmentIdSchema = z.object({
  id: z.string().uuid(),
});

/*
TYPE EXPORT
supaya bisa dipakai di API
*/
export type EquipmentCreateInput = z.infer<typeof equipmentCreateSchema>;
export type EquipmentUpdateInput = z.infer<typeof equipmentUpdateSchema>;
export type EquipmentIdInput = z.infer<typeof equipmentIdSchema>;
