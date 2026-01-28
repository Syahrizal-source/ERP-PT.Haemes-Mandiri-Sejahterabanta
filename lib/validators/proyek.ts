import { z } from "zod";

export const proyekSchema = z.object({
  kode_proyek: z.string().min(1),
  nama_proyek: z.string().min(1),
  lokasi: z.string().optional(),
  tanggal_mulai: z.string().nullable(),
  tanggal_selesai: z.string().nullable(),
  nilai_kontrak: z.number(),
  status: z.enum(["ongoing", "selesai", "dibatalkan"]),
});
