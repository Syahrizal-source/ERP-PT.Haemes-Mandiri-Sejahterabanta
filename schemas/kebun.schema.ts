import { z } from "zod";

export const lokasiEnum = z.enum(["KALIMANTAN", "DURI", "BALAM"]);

export const kebunBiayaSchema = z.object({
  tanggal: z.string().min(10),
  jenis_biaya: z.string().min(3),
  jumlah: z.number().min(0, "Jumlah tidak boleh minus"),
  id_blok: z.string().uuid().nullable(),
  lokasi: lokasiEnum,
  referensi: z.string().nullable().optional(),
});

export type KebunBiayaInput = z.infer<typeof kebunBiayaSchema>;
