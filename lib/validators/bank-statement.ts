import { z } from "zod";

export const bankStatementSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  keterangan: z.string().min(3),
  debit: z.number().nonnegative(),
  kredit: z.number().nonnegative(),
  saldo: z.number().nonnegative(),
});

export type BankStatementInput = z.infer<typeof bankStatementSchema>;
