import { z } from "zod";

export const armadaSchema = z.object({
  user_id: z.number().int().positive(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kode_transaksi: z.string().min(3),
  no_polisi: z.string().min(3),
  no_pintu: z.string().min(1),
  supir: z.string().min(3),
  hp: z.string().optional(),
  buangan_galian: z.string(),

  m3: z.number().nonnegative(),
  rit: z.number().int().positive(),

  tagihan: z.number().nonnegative(),
  uang_jalan: z.number().nonnegative(),
  belanja: z.number().nonnegative(),
  do_qty: z.number().nonnegative(),

  mel: z.number().nonnegative(),
  tambal_ban: z.number().nonnegative(),
  inap_um: z.number().nonnegative(),
  sub_bak_besar: z.number().nonnegative(),
  perg_solar: z.number().nonnegative(),
  kaca_film_bemper: z.number().nonnegative(),
  sparepart: z.number().nonnegative(),
  koordinasi: z.number().nonnegative(),
  adm: z.number().nonnegative(),
  stnk_kir: z.number().nonnegative(),
});
