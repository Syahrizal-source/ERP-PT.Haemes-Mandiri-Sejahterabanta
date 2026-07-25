import { z } from "zod";

export const PurchaseReceiptItemSchema = z.object({
  nama_item: z.string().min(1),
  qty: z.number().positive(),
  harga: z.number().positive(),
});

export const PurchaseReceiptSchema = z.object({
  purchase_order_id: z.string().uuid().nullable().optional(),

  tanggal: z.string(),

  vendor_id: z.number(),

  id_proyek: z.string().uuid().nullable().optional(),

  ppn: z.number().nonnegative().default(0),

  pph21: z.number().nonnegative().default(0),

  pph23: z.number().nonnegative().default(0),

  pph4: z.number().nonnegative().default(0),

  items: z.array(PurchaseReceiptItemSchema).min(1),
});

export type PurchaseReceiptInput = z.infer<typeof PurchaseReceiptSchema>;
