import { z } from "zod";

export const proyekRealisasiSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  id_rab: z.string().uuid("ID RAB tidak valid.").nullable().optional(),

  id_kategori: z
    .number()
    .int("Kategori biaya tidak valid.")
    .positive("Kategori biaya wajib dipilih."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(50, "Nomor bukti maksimal 50 karakter."),

  uraian: z.string().trim().min(1, "Uraian wajib diisi."),

  qty: z.number().positive("Qty harus lebih besar dari 0."),

  satuan: z
    .string()
    .trim()
    .max(30, "Satuan maksimal 30 karakter.")
    .nullable()
    .optional(),

  harga: z.number().nonnegative("Harga tidak boleh negatif."),

  metode_pembayaran: z.enum([
    "KAS",
    "KAS_BESAR",
    "KAS_KECIL",
    "BANK",
    "HUTANG",
  ]),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekRealisasiRequest = z.infer<typeof proyekRealisasiSchema>;
