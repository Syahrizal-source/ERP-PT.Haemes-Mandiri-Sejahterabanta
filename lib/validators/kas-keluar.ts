import { z } from "zod";

export const kasKeluarSchema = z.object({
  tanggal: z.string(),
  no_bukti: z.string().min(1),
  tujuan: z.string().min(1),
  id_akun_kas: z.number(),
  id_akun_beban: z.number(),
  nominal: z.number().positive(),
  keterangan: z.string().min(1),
});

export type KasKeluarInput = z.infer<typeof kasKeluarSchema>;
