import { z } from "zod";

export const pembayaranInvoiceSchema = z.object({
  tanggal: z.string().min(1),
  id_invoice: z.number().int().positive(),
  nominal: z.number().positive(),
  keterangan: z.string().min(1),
});

export type PembayaranInvoiceInput = z.infer<typeof pembayaranInvoiceSchema>;
