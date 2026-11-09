import { z } from "zod";

const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus berformat YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Tanggal tidak valid");

const nominalSchema = z
  .number()
  .finite("Nominal harus berupa angka")
  .positive("Nominal pembayaran harus lebih besar dari 0")
  .max(9999999999999999.99, "Nominal melebihi batas database")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Nominal maksimal memiliki 2 angka desimal",
  );

export const pembayaranPph23Schema = z
  .object({
    tanggal: tanggalSchema,
    id_pph23: z.number().int().positive("ID PPh23 tidak valid"),
    nominal: nominalSchema,
    keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(10000),
    id_coa_kas: z.number().int().positive("COA kas/bank wajib dipilih"),
  })
  .strict();

export type PembayaranPph23Input = z.infer<typeof pembayaranPph23Schema>;
