import { z } from "zod";

export const ProyekPenerimaanSchema = z.object({
  id_tagihan: z.string().uuid(),
  tanggal: z.string().min(1),
  jumlah: z.number().min(0),
  metode: z.string().optional(),
  bank: z.string().optional(),
});

export type ProyekPenerimaanInput = z.infer<typeof ProyekPenerimaanSchema>;
