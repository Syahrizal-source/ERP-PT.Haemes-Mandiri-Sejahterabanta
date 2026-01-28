import { z } from "zod";

export const AdministrasiSchema = z.object({
  tanggal: z.string().min(10),
  deskripsi: z.string().min(1),
  periode: z.string().min(1),
});

export type AdministrasiInput = z.infer<typeof AdministrasiSchema>;
