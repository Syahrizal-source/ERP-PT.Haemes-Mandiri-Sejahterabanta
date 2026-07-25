import { z } from "zod";

export const proyekProgressSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  target_volume: z.number().min(0, "Target tidak boleh minus"),
  realisasi_volume: z.number().min(0, "Realisasi tidak boleh minus"),
  keterangan: z.string().optional(),
});
