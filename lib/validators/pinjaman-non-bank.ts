import { z } from "zod";

/* =========================
   SCHEMA PINJAMAN (FIX)
========================= */

export const pinjamanNonBankSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  deskripsi: z.string().min(1, "Deskripsi wajib diisi"),
  pihak: z.string().min(1, "Pihak wajib diisi"),

  nominal: z.coerce.number().positive("Nominal harus lebih dari 0"),

  bunga_persen: z.coerce.number().min(0, "Bunga tidak boleh negatif"),

  tanggal_pengembalian: z.string().optional().nullable(),
});

export type PinjamanNonBankInput = z.infer<typeof pinjamanNonBankSchema>;
