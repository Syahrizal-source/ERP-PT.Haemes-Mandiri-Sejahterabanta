import { z } from "zod";

export const operatorCreateSchema = z
  .object({
    name: z.string().min(1, "Nama operator wajib diisi"),
    employee_id: z.string().min(1).nullable().optional(),
    is_active: z.boolean().optional(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.ppn === true ||
      data.pph21 === true ||
      data.pph23 === true ||
      data.pph4 === true,
    {
      message:
        "Operator wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"], // penanda error
    },
  );

export const operatorUpdateSchema = operatorCreateSchema.partial();
