import { z } from "zod";

export const proyekPembayaranHutangSchema = z.object({
  id_hutang: z.string().uuid("ID hutang harus berupa UUID"),

  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),

  jumlah: z
    .number()
    .finite()
    .nonnegative("Jumlah pembayaran tidak boleh negatif"),

  metode: z.string().trim().nullable().optional(),

  bank: z.string().trim().nullable().optional(),

  no_bukti: z
    .string()
    .trim()
    .max(50, "Nomor bukti maksimal 50 karakter")
    .nullable()
    .optional(),

  periode: z
    .string()
    .trim()
    .max(30, "Periode maksimal 30 karakter")
    .nullable()
    .optional(),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z
    .string()
    .uuid("Created by harus berupa UUID")
    .nullable()
    .optional(),
});

export type ProyekPembayaranHutangInput = z.infer<
  typeof proyekPembayaranHutangSchema
>;

/**
 * Alias kompatibilitas untuk fungsi accounting
 * dan API yang menggunakan nama Request.
 */
export type ProyekPembayaranHutangRequest = ProyekPembayaranHutangInput;
