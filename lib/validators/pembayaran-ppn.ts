import { z } from "zod";

export const pembayaranPpnSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),

  id_ppn: z.number().int().positive().safe(),

  nominal: z
    .number()
    .positive("Nominal pembayaran harus lebih besar dari nol")
    .finite(),

  keterangan: z.string().trim().min(1, "Keterangan wajib diisi"),

  id_coa_kas: z.number().int().positive().safe(),
});

export type PembayaranPpnInput = z.infer<typeof pembayaranPpnSchema>;
