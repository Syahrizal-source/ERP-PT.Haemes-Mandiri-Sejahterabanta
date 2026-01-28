import { z } from "zod";

export const asetSchema = z.object({
  nama: z.string().min(1),
  nilai_perolehan: z.number().positive(),
  tanggal_perolehan: z.string().min(10),
  umur_manfaat: z.number().int().positive(),
});

export type AsetInput = z.infer<typeof asetSchema>;
