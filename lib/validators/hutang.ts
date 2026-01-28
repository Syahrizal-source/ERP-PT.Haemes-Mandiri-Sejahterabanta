import { z } from "zod";

export const hutangSchema = z.object({
  supplier: z.string().min(1),
  no_invoice: z.string().min(1),
  tanggal: z.string().min(10),
  jatuh_tempo: z.string().min(10),
  nilai: z.number().positive(),
  status: z.enum([
    "Unpaid (Menunggu Pembayaran)",
    "Partial (Pembayaran Sebagian)",
    "Paid (Pembayaran Penuh/ Lunas)",
  ]),
});

export type HutangInput = z.infer<typeof hutangSchema>;
