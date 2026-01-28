import { z } from "zod";

export const kasbonPribadiSchema = z.object({
  tanggal: z.string().min(1),
  deskripsi: z.string().min(1),
  no_voucher: z.string().min(1),
  debit: z.number().nonnegative(),
  kredit: z.number().nonnegative(),
});

export const kasbonDireksiSchema = z.object({
  tanggal: z.string().min(1),
  deskripsi: z.string().min(1),
  no_voucher: z.string().min(1),
  debit: z.number().nonnegative(),
  kredit: z.number().nonnegative(),
});
