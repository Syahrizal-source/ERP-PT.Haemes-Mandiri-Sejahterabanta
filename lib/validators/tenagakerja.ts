import { z } from "zod";

export const tenagaKerjaSchema = z.object({
  proyek_id: z.number().min(1), // minimal 1 supaya ada id proyek valid
  nama: z.string().min(1), // minimal 1 karakter
  jabatan: z.string().min(1),
  upah_harian: z.number().min(0), // anti minus
  hari_kerja: z.number().min(0), // anti minus
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"), // bisa tambah regex validasi YYYY-MM-DD jika perlu
});

export const tenagaKerjaUpdateSchema = z.object({
  proyek_id: z.number().min(1),
  nama: z.string().min(1),
  jabatan: z.string().min(1),
  upah_harian: z.number().min(0),
  hari_kerja: z.number().min(0),
  tanggal: z.string(),
});
