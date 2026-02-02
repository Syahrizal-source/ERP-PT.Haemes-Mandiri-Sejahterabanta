import { z } from "zod";

export const fuelLogCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),
    fuel_date: z.string(), // ISO date
    fuel_liter: z.number().positive(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  // minimal satu pajak
  .refine(
    (data) =>
      data.ppn === true ||
      data.pph21 === true ||
      data.pph23 === true ||
      data.pph4 === true,
    {
      message:
        "Fuel log wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const fuelLogUpdateSchema = fuelLogCreateSchema.partial();
