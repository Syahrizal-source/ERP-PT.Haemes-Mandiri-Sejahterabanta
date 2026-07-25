import { z } from "zod";

export const TagihanProyekSchema = z.object({
  id_proyek: z.string().uuid("ID Proyek tidak valid"),

  nomor_invoice: z.string().min(1, "Nomor invoice wajib diisi"),

  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  nilai: z.number().min(0, "Nilai tidak boleh minus"),

  status: z.enum([
    "Unpaid (Menunggu Pembayaran)",
    "Partial (Pembayaran Sebagian)",
    "Paid (Pembayaran Penuh/ Lunas)",
  ]),
});

export type TagihanProyekInput = z.infer<typeof TagihanProyekSchema>;
