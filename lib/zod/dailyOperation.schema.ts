import { z } from "zod";

export const dailyOperationCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),
    operator_id: z.string().uuid(),
    operation_date: z.string(), // ISO date

    working_hours: z.number().nonnegative(),
    production: z.number().nonnegative(),
    fuel_consumption: z.number().nonnegative(),

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
        "Daily operation wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const dailyOperationUpdateSchema = dailyOperationCreateSchema.partial();
