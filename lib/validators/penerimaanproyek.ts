import { z } from "zod";

// =====================================================
// METODE PEMBAYARAN
// =====================================================

export const ProyekPenerimaanMetodeSchema = z.enum(["KAS", "BANK"]);

// =====================================================
// PROYEK PENERIMAAN
// =====================================================

export const ProyekPenerimaanSchema = z.object({
  id_tagihan: z.string().uuid("ID tagihan tidak valid."),

  tanggal: z.string().min(1, "Tanggal penerimaan wajib diisi."),

  jumlah: z
    .number()
    .finite("Jumlah penerimaan tidak valid.")
    .min(0, "Jumlah penerimaan tidak boleh minus."),

  metode: ProyekPenerimaanMetodeSchema,

  bank: z.string().trim().nullable().optional(),
});

// =====================================================
// TYPE
// =====================================================

export type ProyekPenerimaanInput = z.infer<typeof ProyekPenerimaanSchema>;
