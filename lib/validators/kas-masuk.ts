import { z } from "zod";

export const kasMasukSchema = z.object({
  tanggal: z.string().min(10),
  no_bukti: z.string().min(1),
  sumber: z.string().min(1),

  id_akun_kas: z.number().int().positive(),
  id_akun_lawan: z.number().int().positive(),

  nominal: z.number().positive(),

  keterangan: z.string().min(1),
});

export type KasMasukInput = z.infer<typeof kasMasukSchema>;
