import { z } from "zod";

export const proyekSubkonSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  id_kategori: z
    .number()
    .int("Kategori subkon tidak valid.")
    .positive("Kategori subkon wajib dipilih."),

  tanggal: z.string().min(1, "Tanggal wajib diisi."),

  // Dibuat backend jika tidak dikirim dari form
  no_bukti: z
    .string()
    .trim()
    .max(50, "Nomor bukti maksimal 50 karakter.")
    .nullable()
    .optional(),

  nama_vendor: z
    .string()
    .trim()
    .min(1, "Nama vendor wajib diisi.")
    .max(150, "Nama vendor maksimal 150 karakter."),

  pekerjaan: z
    .string()
    .trim()
    .min(1, "Pekerjaan wajib diisi.")
    .max(250, "Pekerjaan maksimal 250 karakter."),

  nilai_kontrak: z.number().positive("Nilai kontrak harus lebih besar dari 0."),

  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),

  periode: z
    .string()
    .trim()
    .max(50, "Periode maksimal 50 karakter.")
    .nullable()
    .optional(),

  status: z.enum(["AKTIF", "SELESAI", "DIBATALKAN"]).optional(),

  keterangan: z
    .string()
    .trim()
    .max(500, "Keterangan maksimal 500 karakter.")
    .nullable()
    .optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekSubkonRequest = z.infer<typeof proyekSubkonSchema>;
