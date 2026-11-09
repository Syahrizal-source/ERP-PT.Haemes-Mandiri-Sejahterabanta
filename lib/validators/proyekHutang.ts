import { z } from "zod";

const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .nullable()
  .optional();

export const proyekHutangSchema = z.object({
  id_proyek: z.string().uuid("ID proyek harus berupa UUID"),

  supplier: z.string().trim().nullable().optional(),

  tanggal: nullableDateSchema,

  nilai: z.number().finite().nonnegative("Nilai tidak boleh negatif"),

  jatuh_tempo: nullableDateSchema,

  status: z.string().trim().nullable().optional(),

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

  sumber: z
    .string()
    .trim()
    .max(30, "Sumber maksimal 30 karakter")
    .nullable()
    .optional(),

  id_referensi: z
    .string()
    .uuid("ID referensi harus berupa UUID")
    .nullable()
    .optional(),

  jumlah_pembayaran: z.number().finite().nonnegative().default(0),

  sisa: z.number().finite().nullable().optional(),

  tanggal_pembayaran: nullableDateSchema,

  keterangan: z.string().trim().nullable().optional(),

  id_kategori: z.number().int().positive().safe().nullable().optional(),
});

export type ProyekHutangInput = z.input<typeof proyekHutangSchema>;

/**
 * Alias kompatibilitas untuk API dan accounting
 * yang masih menggunakan nama ProyekHutangRequest.
 */
export type ProyekHutangRequest = ProyekHutangInput;
