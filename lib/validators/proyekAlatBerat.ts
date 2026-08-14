import { z } from "zod";

export const proyekAlatBeratSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid."),

  id_alat: z.string().min(1, "Alat berat wajib dipilih."),

  id_kategori: z
    .number()
    .int("Kategori biaya tidak valid.")
    .positive("Kategori biaya wajib dipilih."),

  no_bukti: z
    .string()
    .trim()
    .min(1, "Nomor bukti wajib diisi.")
    .max(50, "Nomor bukti maksimal 50 karakter."),

  tanggal_mulai: z.string().min(1, "Tanggal mulai wajib diisi."),

  tanggal_selesai: z.string().nullable().optional(),

  tarif_sewa_internal: z.number().min(0, "Tarif sewa tidak boleh negatif."),

  jam_operasi: z.number().min(0, "Jam operasi tidak boleh negatif."),

  metode_pembayaran: z.enum(["KAS", "BANK", "HUTANG"]),

  status: z.enum(["AKTIF", "SELESAI", "DIBATALKAN"]),

  periode: z.string().trim().max(50).nullable().optional(),

  keterangan: z.string().trim().nullable().optional(),

  created_by: z.string().uuid("Created By tidak valid.").nullable().optional(),
});

export type ProyekAlatBeratRequest = z.infer<typeof proyekAlatBeratSchema>;
