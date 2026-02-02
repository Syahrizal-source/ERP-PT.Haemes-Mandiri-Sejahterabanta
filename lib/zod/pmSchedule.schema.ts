import { z } from "zod";

export const pmScheduleCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),

    pm_type: z.union([z.literal(250), z.literal(500), z.literal(1000)]),

    last_hm: z.number().nonnegative(),

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
        "PM Schedule wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const pmScheduleUpdateSchema = pmScheduleCreateSchema.partial();
