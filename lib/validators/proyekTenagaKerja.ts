import { z } from "zod";

export const proyekTenagaKerjaSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  nama: z
    .string()
    .trim()
    .min(1, "Nama tenaga kerja wajib diisi.")
    .max(150, "Nama maksimal 150 karakter."),

  jabatan: z
    .string()
    .trim()
    .max(100, "Jabatan maksimal 100 karakter.")
    .nullable()
    .optional(),

  tipe: z.enum([
    "MANAJEMEN_PROYEK",
    "TENAGA_AHLI",
    "TEKNISI_ANALIS",
    "OPERATOR_ALAT_BERAT",
    "OPERATOR_ANGKUTAN",
    "PEKERJA_LAPANGAN",
    "ADMINISTRASI",
  ]),

  upah: z.number().positive("Upah harus lebih besar dari 0."),

  periode: z
    .string()
    .trim()
    .max(50, "Periode maksimal 50 karakter.")
    .nullable()
    .optional(),

  tanggal_mulai: z.string().min(1, "Tanggal mulai wajib diisi."),

  tanggal_selesai: z.string().nullable().optional(),

  status: z.enum(["AKTIF", "SELESAI", "DIBATALKAN"]),

  no_bukti: z.string().trim().max(50).nullable().optional(),

  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekTenagaKerjaRequest = z.infer<typeof proyekTenagaKerjaSchema>;
