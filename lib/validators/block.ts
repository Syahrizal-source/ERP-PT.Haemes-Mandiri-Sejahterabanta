import { z } from "zod";

export const blockSchema = z.object({
  division_id: z.string().uuid("Division tidak valid"),

  code: z
    .string()
    .min(1, "Kode blok wajib diisi")
    .max(20, "Kode terlalu panjang"),

  planting_year: z.coerce
    .number()
    .int("Tahun harus angka bulat")
    .min(1900, "Tahun tidak valid")
    .max(new Date().getFullYear(), "Tahun tidak boleh di masa depan"),

  area_ha: z.coerce.number().min(0, "Luas tidak boleh negatif"),

  palm_population: z.coerce
    .number()
    .int("Populasi harus bilangan bulat")
    .min(0, "Populasi tidak boleh negatif"),

  status: z.enum(["TBM", "TM", "TUA"], {
    message: "Status blok tidak valid",
  }),

  seed_type: z
    .string()
    .min(1, "Jenis bibit wajib diisi")
    .max(100, "Jenis bibit terlalu panjang"),

  id_cost_center: z.string().uuid().nullable().optional(),

  is_active: z.boolean().optional(),
});

export const blockUpdateSchema = blockSchema.partial();

export type BlockInput = z.infer<typeof blockSchema>;
export type BlockUpdateInput = z.infer<typeof blockUpdateSchema>;
