import { z } from "zod";

export const downtimeLogCreateSchema = z
  .object({
    equipment_id: z.string().uuid(),

    start_time: z.string(), // ISO timestamp
    end_time: z.string(), // ISO timestamp

    downtime_type: z.enum(["MECHANICAL", "OPERATIONAL", "WAITING_PART"]),

    reason: z.string().nullable().optional(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  // anti minus / anti salah waktu
  .refine(
    (data) =>
      new Date(data.end_time).getTime() > new Date(data.start_time).getTime(),
    {
      message: "End time harus lebih besar dari start time",
      path: ["end_time"],
    },
  )
  // wajib salah satu pajak
  .refine(
    (data) =>
      data.ppn === true ||
      data.pph21 === true ||
      data.pph23 === true ||
      data.pph4 === true,
    {
      message:
        "Downtime wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const downtimeLogUpdateSchema = downtimeLogCreateSchema.partial();
