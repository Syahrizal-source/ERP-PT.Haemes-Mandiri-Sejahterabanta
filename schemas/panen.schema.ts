import { z } from "zod";

export const lokasiEnum = z.enum(["KALIMANTAN", "DURI", "BALAM"]);

export const panenTbsSchema = z.object({
  tanggal_panen: z.string().min(10),
  id_blok: z.string().uuid(),
  jumlah_tandan: z.number().min(0, "Tidak boleh minus"),
  berat_tbs_kg: z.number().min(0, "Tidak boleh minus"),
  hasil_per_ha: z.number().min(0, "Tidak boleh minus"),
  mandor: z.string().min(3),
  kualitas: z.enum(["A", "B", "C"]),
  lokasi: lokasiEnum,
});

export type PanenTbsInput = z.infer<typeof panenTbsSchema>;
