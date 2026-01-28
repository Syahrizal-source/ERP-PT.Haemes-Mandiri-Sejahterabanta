import { z } from "zod";

export const pph4Schema = z.object({
  id_vendor: z.number().int().positive(),
  jenis_objek: z.string().min(3),
  nilai_transaksi: z.number().nonnegative(),
  tarif_pph4: z.number().min(0),
  tanggal_transaksi: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
});

export type Pph4Input = z.infer<typeof pph4Schema>;
export type Pph4UpdateInput = Pph4Input;
