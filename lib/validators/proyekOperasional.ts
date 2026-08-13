import { z } from "zod";

export const proyekOperasionalSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  id_kategori: z
    .number()
    .int("Kategori operasional tidak valid.")
    .positive("Kategori operasional wajib dipilih."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  no_bukti: z
    .string()
    .trim()
    .max(50, "Nomor bukti maksimal 50 karakter.")
    .nullable()
    .optional(),

  uraian: z
    .string()
    .trim()
    .min(1, "Uraian wajib diisi.")
    .max(200, "Uraian maksimal 200 karakter."),

  qty: z.number().positive("Qty harus lebih besar dari 0."),

  satuan: z.string().trim().max(30, "Satuan maksimal 30 karakter."),

  harga: z.number().min(0, "Harga tidak boleh negatif."),

  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),

  periode: z.string().trim().max(50).nullable().optional(),

  supplier: z.string().trim().max(150).nullable().optional(),

  status: z.enum(["DRAFT", "POSTED", "DIBATALKAN"]).optional(),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekOperasionalRequest = z.infer<typeof proyekOperasionalSchema>;
