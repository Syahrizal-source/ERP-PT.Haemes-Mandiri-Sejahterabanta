import { z } from "zod";

export const penerimaanApartemenSchema = z.object({
  tanggal: z.string(),
  deskripsi: z.string().min(1),
  nilai: z.number().nonnegative(),
  keterangan: z.string().optional().nullable(),
});

export type PenerimaanApartemenInput = z.infer<
  typeof penerimaanApartemenSchema
>;
