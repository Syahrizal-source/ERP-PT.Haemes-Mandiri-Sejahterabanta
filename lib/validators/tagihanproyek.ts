import { z } from "zod";

export const tagihanProyekSchema = z.object({
  proyek_id: z.number(),
  tanggal: z.string(), // YYYY-MM-DD
  no_kwitansi: z
    .string()
    .regex(
      /^\d+\/[A-Z]+-[A-Z]+\/[IVXLCDM]+\/\d{2}$/,
      "Format no_kwitansi tidak valid (contoh: 92/HAE-IDP/IX/25)"
    ),
  deskripsi: z.string(),
  tanggal_pembayaran: z.string(), // YYYY-MM-DD
  debet: z.number(),
  kredit: z.number(),
});
