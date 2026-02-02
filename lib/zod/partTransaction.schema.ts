import { z } from "zod";

export const partTransactionCreateSchema = z
  .object({
    part_id: z.string().uuid(),
    wo_id: z.string().uuid().nullable().optional(),

    transaction_type: z.enum(["ISSUE", "RETURN"]),
    qty: z.number().positive(),

    transaction_date: z.string().optional(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  // wajib salah satu pajak
  .refine(
    (data) =>
      data.ppn === true ||
      data.pph21 === true ||
      data.pph23 === true ||
      data.pph4 === true,
    {
      message:
        "Transaksi part wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const partTransactionUpdateSchema =
  partTransactionCreateSchema.partial();
