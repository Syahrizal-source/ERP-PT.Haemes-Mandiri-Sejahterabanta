import { z } from "zod";

export const proyekMaterialSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  id_kategori: z
    .number()
    .int("Kategori material tidak valid.")
    .positive("Kategori material wajib dipilih."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(50, "Nomor bukti maksimal 50 karakter."),

  qty: z.number().positive("Qty harus lebih besar dari 0."),

  satuan: z
    .string()
    .trim()
    .min(1, "Satuan wajib diisi.")
    .max(30, "Satuan maksimal 30 karakter."),

  harga: z.number().nonnegative("Harga tidak boleh negatif."),

  metode_pembayaran: z.enum([
    "KAS",
    "KAS_BESAR",
    "KAS_KECIL",
    "BANK",
    "HUTANG",
  ]),

  gudang: z
    .string()
    .trim()
    .max(100, "Gudang maksimal 100 karakter.")
    .nullable()
    .optional(),

  supplier: z
    .string()
    .trim()
    .max(150, "Supplier maksimal 150 karakter.")
    .nullable()
    .optional(),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekMaterialRequest = z.infer<typeof proyekMaterialSchema>;
