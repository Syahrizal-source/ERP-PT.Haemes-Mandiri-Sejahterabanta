import { z } from "zod";

export const PurchasePaymentSchema = z.object({
  receipt_id: z.string().uuid().nullable().optional(),

  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  vendor_id: z.number().int().positive(),

  subtotal: z.number().nonnegative(),

  ppn: z.number().nonnegative(),

  pph21: z.number().nonnegative(),

  pph23: z.number().nonnegative(),

  pph4: z.number().nonnegative(),

  jumlah: z.number().positive(),

  metode: z.string().nullable().optional(),

  id_jurnal: z.number().int().nullable().optional(),
});

export type PurchasePaymentInput = z.infer<typeof PurchasePaymentSchema>;
