import { z } from "zod";

export const workPremiumSchema = z.object({
  employee_id: z.string().uuid("Employee tidak valid"),

  block_id: z.string().uuid("Block tidak valid").nullable().optional(),

  work_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Tanggal tidak valid",
  }),

  work_type: z.string().min(1, "Jenis pekerjaan wajib diisi").max(50),

  work_result: z.coerce.number().min(0, "Hasil kerja tidak boleh minus"),

  rate: z.coerce.number().min(0, "Rate tidak boleh minus"),

  pph21_rate: z.coerce
    .number()
    .min(0, "PPh21 tidak boleh minus")
    .max(100, "PPh21 maksimal 100%"),

  notes: z.string().optional(),
});

export const workPremiumUpdateSchema = workPremiumSchema.partial();

export type WorkPremiumInput = z.infer<typeof workPremiumSchema>;
export type WorkPremiumUpdateInput = z.infer<typeof workPremiumUpdateSchema>;
