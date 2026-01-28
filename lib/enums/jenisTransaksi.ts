import { z } from "zod";

export const JenisTransaksiEnum = z.enum([
  "PANEN_TBS",
  "PEMUPUKAN",
  "HAMA_PENYAKIT",
  "OPERASIONAL_KEBUN",
  "GAJI",
]);

export type JenisTransaksi = z.infer<typeof JenisTransaksiEnum>;
