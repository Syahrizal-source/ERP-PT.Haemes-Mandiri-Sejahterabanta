import { z } from "zod";

export const dailyCheckCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),
    operator_id: z.string().uuid(),
    check_date: z.string(), // ISO date

    hm_start: z.number().nonnegative(),
    hm_end: z.number().nonnegative(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  // anti minus (logic layer)
  .refine((data) => data.hm_end >= data.hm_start, {
    message: "HM akhir tidak boleh lebih kecil dari HM awal",
    path: ["hm_end"],
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
        "Daily check wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const dailyCheckUpdateSchema = dailyCheckCreateSchema.partial();
