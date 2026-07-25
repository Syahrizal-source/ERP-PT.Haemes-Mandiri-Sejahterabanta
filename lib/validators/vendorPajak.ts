import { z } from "zod";

export const vendorPajakSchema = z.object({
  vendor_id: z.number().int().positive(),

  npwp: z.string().nullable().optional(),
  nama_npwp: z.string().nullable().optional(),
  alamat_npwp: z.string().nullable().optional(),

  pkp: z.boolean().optional(),
});

export const vendorPajakUpdateSchema = vendorPajakSchema.partial();

export type VendorPajakInput = z.infer<typeof vendorPajakSchema>;

export type VendorPajakUpdateInput = z.infer<typeof vendorPajakUpdateSchema>;
