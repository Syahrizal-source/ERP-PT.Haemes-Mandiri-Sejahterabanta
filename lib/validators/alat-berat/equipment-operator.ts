import { z } from "zod";

export const equipmentOperatorCreateSchema = z.object({
  nama: z.string().trim().min(1),

  no_hp: z.string().trim().nullable().optional(),

  sim: z.string().trim().nullable().optional(),

  status: z.string().trim().optional(),
});

export const equipmentOperatorUpdateSchema = z.object({
  id: z.string().uuid(),

  nama: z.string().trim().min(1).optional(),

  no_hp: z.string().trim().nullable().optional(),

  sim: z.string().trim().nullable().optional(),

  status: z.string().trim().optional(),
});

export const equipmentOperatorIdSchema = z.object({
  id: z.string().uuid(),
});

export type EquipmentOperatorCreateInput = z.infer<
  typeof equipmentOperatorCreateSchema
>;

export type EquipmentOperatorUpdateInput = z.infer<
  typeof equipmentOperatorUpdateSchema
>;

export type EquipmentOperatorIdInput = z.infer<
  typeof equipmentOperatorIdSchema
>;
