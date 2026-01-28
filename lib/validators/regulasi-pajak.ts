import { z } from "zod";

export const regulasiPajakSchema = z.object({
  kode_pajak: z.string().min(3),
  nama: z.string().min(5),
  tarif: z.number().min(0).max(100),
  tahun: z.number().int().min(2000),
  coa_beban: z.number().int().optional(),
  coa_hutang: z.number().int().optional(),
  berlaku_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  berlaku_sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const regulasiPajakUpdateSchema = regulasiPajakSchema.partial();
