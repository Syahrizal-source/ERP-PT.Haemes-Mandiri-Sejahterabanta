import { z } from "zod";

export const AdministrasiSchema = z.object({
  tanggal: z.string(), // yyyy-mm-dd
  deskripsi: z.string().min(3),
  periode: z.string().min(4),
});

export type AdministrasiInput = z.infer<typeof AdministrasiSchema>;
