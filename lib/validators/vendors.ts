import { z } from "zod";

export const vendorSchema = z.object({
  kode_vendor: z.string().min(1),
  nama_vendor: z.string().min(1),

  kategori_vendor: z.string().nullable().optional(),

  npwp: z.string().nullable().optional(),
  nama_npwp: z.string().nullable().optional(),
  alamat_npwp: z.string().nullable().optional(),

  telepon: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),

  alamat: z.string().nullable().optional(),

  status: z.boolean().optional(),
});

export const vendorUpdateSchema = vendorSchema.partial();

export type VendorInput = z.infer<typeof vendorSchema>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
