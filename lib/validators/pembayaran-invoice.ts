import { z } from "zod";

export const pembayaranInvoiceSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),

  id_invoice: z.number().int().positive().safe(),

  nominal: z
    .number()
    .positive("Nominal pembayaran harus lebih besar dari nol")
    .finite(),

  keterangan: z.string().trim().min(1, "Keterangan wajib diisi"),

  ppn: z.number().finite().nonnegative().nullable().default(0),

  pph23: z.number().finite().nonnegative().nullable().default(0),

  total: z.number().finite().positive().nullable(),

  id_coa_debit: z.number().int().positive().safe(),
});

export type PembayaranInvoiceInput = z.infer<typeof pembayaranInvoiceSchema>;
