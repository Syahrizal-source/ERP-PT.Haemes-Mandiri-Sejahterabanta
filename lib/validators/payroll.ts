import { z } from "zod";

export const payrollSchema = z.object({
  bulan: z.number().int().min(1).max(12),
  tahun: z.number().int().min(2000).max(2100),
  total_gaji: z.number().min(0),
  total_tunjangan: z.number().min(0),
  total_potongan: z.number().min(0),
});

export type PayrollInput = z.infer<typeof payrollSchema>;
