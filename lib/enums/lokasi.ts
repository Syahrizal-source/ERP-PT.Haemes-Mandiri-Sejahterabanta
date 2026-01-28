import { z } from "zod";

/**
 * ENUM LOKASI RESMI SISTEM
 * SEMUA DATA DISIMPAN DALAM HURUF BESAR
 */
export const LokasiEnum = z.enum(["KALIMANTAN", "DURI", "BALAM"]);

export type Lokasi = z.infer<typeof LokasiEnum>;
