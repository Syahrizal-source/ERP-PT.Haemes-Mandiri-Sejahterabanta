import { z } from "zod";

export const PurchaseOrderItemSchema = z.object({
  nama_item: z.string().min(1),
  qty: z.number().positive(),
  harga: z.number().positive(),
});

export const PurchaseOrderSchema = z.object({
  nomor: z.string().min(1),
  tanggal: z.string(),

  vendor_id: z.number(),

  id_proyek: z.string().uuid().nullable().optional(),

  keterangan: z.string().nullable().optional(),

  status: z.string().optional(),

  items: z.array(PurchaseOrderItemSchema).min(1),
});

export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;
