import { z } from "zod";

export const workOrderCreateSchema = z
  .object({
    wo_number: z.string().min(1),
    equipment_id: z.string().uuid(),

    job_type: z.enum(["PM", "CM"]),
    complaint: z.string().nullable().optional(),

    mechanic_id: z.string().uuid().nullable().optional(),

    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),

    status: z.enum(["OPEN", "PROGRESS", "CLOSED"]).optional(),

    // flag pajak
    ppn: z.boolean().optional(),
    pph21: z.boolean().optional(),
    pph23: z.boolean().optional(),
    pph4: z.boolean().optional(),
  })
  // validasi waktu (anti minus)
  .refine(
    (data) =>
      !data.start_time ||
      !data.end_time ||
      new Date(data.end_time).getTime() >= new Date(data.start_time).getTime(),
    {
      message: "End time tidak boleh lebih kecil dari start time",
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
        "Work order wajib memiliki minimal satu pajak (PPN / PPh21 / PPh23 / PPh4)",
      path: ["ppn"],
    },
  );

export const workOrderUpdateSchema = workOrderCreateSchema.partial();
