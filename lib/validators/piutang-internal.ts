import { z } from "zod";

export const piutangInternalSchema = z.object({
  tanggal: z.string().min(1),
  pihak: z.string().min(1),
  keterangan: z.string().optional().default(""),
  nominal: z.number().positive(),
});
