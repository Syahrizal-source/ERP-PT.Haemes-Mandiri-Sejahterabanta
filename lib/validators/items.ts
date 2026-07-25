import { z } from "zod";

/* =========================
   CREATE ITEM
========================= */

export const itemCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Nama barang wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),

  category: z
    .string()
    .max(50, "Kategori maksimal 50 karakter")
    .nullable()
    .optional(),

  unit: z
    .string()
    .min(1, "Satuan wajib diisi")
    .max(20, "Satuan maksimal 20 karakter"),

  minimum_stock: z.coerce.number().min(0, "Minimum stock tidak boleh minus"),
});

/* =========================
   UPDATE ITEM
========================= */

export const itemUpdateSchema = itemCreateSchema.partial();

/* =========================
   PARAM ID
========================= */

export const itemParamSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
