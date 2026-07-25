import { z } from "zod";

export const vendorRekeningSchema = z.object({
  vendor_id: z.number().int().positive(),

  nama_bank: z.string().min(1),
  nomor_rekening: z.string().min(1),
  nama_rekening: z.string().min(1),
});

export const vendorRekeningUpdateSchema = vendorRekeningSchema.partial();

export type VendorRekeningInput = z.infer<typeof vendorRekeningSchema>;

export type VendorRekeningUpdateInput = z.infer<
  typeof vendorRekeningUpdateSchema
>;
