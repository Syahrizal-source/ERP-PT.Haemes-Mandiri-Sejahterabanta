import { z } from "zod";

export const payrollSchema = z.object({
  bulan: z.number().int().min(1).max(12),
  tahun: z.number().int().min(2000).max(2100),

  /* =========================
     RELASI PEGAWAI (BARU)
  ========================= */
  id_pegawai: z.number().int().positive(),

  /* =========================
     LEGACY (BIAR TIDAK RUSAK)
  ========================= */
  total_gaji: z.number().min(0).optional(),
  total_tunjangan: z.number().min(0).optional(),

  total_potongan: z.number().min(0),

  /* =========================
     OPSIONAL (AUTO HITUNG)
  ========================= */
  pph21: z.number().min(0).optional(),
  bpjs: z.number().min(0).optional(),
});

export type PayrollInput = z.infer<typeof payrollSchema>;
