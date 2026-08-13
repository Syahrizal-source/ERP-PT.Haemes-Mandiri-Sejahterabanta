import { z } from "zod";

export const proyekProgressSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(50, "Nomor bukti maksimal 50 karakter."),

  target_volume: z.number().min(0, "Target volume tidak boleh negatif."),

  realisasi_volume: z.number().min(0, "Realisasi volume tidak boleh negatif."),

  satuan: z.enum(["m3", "m2", "km", "ton", "unit", "ha"]),

  nilai_progress: z
    .number()
    .positive("Nilai progress harus lebih besar dari 0."),

  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),

  status: z.enum(["ON_PROGRESS", "SELESAI", "TERLAMBAT", "DIBATALKAN"]),

  periode: z.string().trim().max(50).nullable().optional(),

  lokasi: z.string().trim().max(200).nullable().optional(),

  pic: z.string().trim().max(100).nullable().optional(),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekProgressRequest = z.infer<typeof proyekProgressSchema>;
