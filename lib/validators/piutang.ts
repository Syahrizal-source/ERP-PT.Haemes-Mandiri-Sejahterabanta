import { z } from "zod";

export const piutangSchema = z.object({
  customer: z.string().min(1),
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

export type PiutangInput = z.infer<typeof piutangSchema>;
