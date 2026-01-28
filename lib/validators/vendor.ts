import { z } from "zod";

export const vendorSchema = z.object({
  nama: z.string().min(1),
  npwp: z.string().optional(),
  alamat: z.string().optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;
