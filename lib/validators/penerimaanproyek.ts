import { z } from "zod";

export const penerimaanProyekSchema = z.object({
  proyek_id: z.number(),
  tanggal: z.string(), // format YYYY-MM-DD
  deskripsi: z.string(),
  no_kwitansi: z
    .string()
    .regex(
      /^\d+\/[A-Z]+-[A-Z]+\/[IVXLCDM]+\/\d{2}$/,
      "Format no_kwitansi tidak valid (contoh: 1/HAE-IAP/VIII/25)"
    ),
  jenis_pembayaran: z.string(), // contoh: BNI/12965308
  tagihan: z.number(),
  pot_lain: z.number().optional().default(0),
  barter: z.boolean().optional().default(false),
});
