import { z } from "zod";

export const inventoryTransactionSchema = z.object({
  item_id: z.string().uuid("Item tidak valid"),

  block_id: z.string().uuid("Block tidak valid").nullable().optional(),

  transaction_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Tanggal tidak valid",
  }),

  transaction_type: z.enum(["IN", "OUT", "ADJUSTMENT"]),

  quantity: z.coerce.number().min(0, "Quantity tidak boleh minus"),

  unit_price: z.coerce.number().min(0, "Harga tidak boleh minus"),

  subtotal: z.coerce.number().min(0, "Subtotal tidak boleh minus").optional(),

  total_amount: z.coerce.number().min(0, "Total tidak boleh minus").optional(),

  ppn: z.coerce.number().min(0).optional(),

  pph23: z.coerce.number().min(0).optional(),

  pph4: z.coerce.number().min(0).optional(),

  reference_module: z.string().optional(),

  notes: z.string().optional(),
});

export const inventoryTransactionUpdateSchema =
  inventoryTransactionSchema.partial();

export type InventoryTransactionInput = z.infer<
  typeof inventoryTransactionSchema
>;

export type InventoryTransactionUpdateInput = z.infer<
  typeof inventoryTransactionUpdateSchema
>;
