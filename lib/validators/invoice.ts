import { z } from "zod";

export const invoiceSchema = z.object({
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),

  tanggal_jatuh_tempo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .nullable()
    .optional(),

  no_invoice: z.string().trim().min(1, "Nomor invoice wajib diisi"),

  customer: z.string().trim().min(1, "Customer wajib diisi"),

  id_proyek: z.string().uuid("ID proyek harus berupa UUID"),

  nominal: z.number().positive("Nominal harus lebih besar dari nol").finite(),

  persentase_termin: z.number().min(0).max(100).finite(),

  potongan_uang_muka: z.number().nonnegative().finite().default(0),

  retensi_persen: z.number().min(0).max(100).finite().default(0),

  ppn_persen: z.number().min(0).max(100).finite().default(0),

  status: z.enum([
    "Unpaid (Menunggu Pembayaran)",
    "Partial (Pembayaran Sebagian)",
    "Paid (Pembayaran Penuh/ Lunas)",
  ]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
