import { z } from "zod";

export const equipmentCreateSchema = z.object({
  asset_number: z.string().trim().min(1, "Asset number wajib diisi"),

  type: z.string().trim().min(1, "Tipe alat wajib diisi"),

  brand: z.string().trim().min(1, "Brand wajib diisi"),

  model: z.string().trim().nullable().optional(),

  serial_number: z.string().trim().nullable().optional(),

  // 👉 aman walau dari Thunder Client kirim angka
  year: z
    .number()
    .int()
    .min(1980, "Tahun minimal 1980")
    .max(new Date().getFullYear(), "Tahun tidak boleh melebihi tahun sekarang"),

  site_id: z.string().uuid("Site ID harus UUID valid").nullable().optional(),

  status: z.enum(["ACTIVE", "STANDBY", "BREAKDOWN"]).optional(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial();
