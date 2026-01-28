import { z } from "zod";

export const invoiceSchema = z.object({
  tanggal: z.string().min(10),

  no_invoice: z.string().min(1),

  customer: z.string().min(1),

  nominal: z.number().positive(),

  status: z.enum([
    "Unpaid (Menunggu Pembayaran)",
    "Partial (Pembayaran Sebagian)",
    "Paid (Pembayaran Penuh/ Lunas)",
  ]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
