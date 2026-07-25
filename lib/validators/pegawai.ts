import { z } from "zod";

export const pegawaiSchema = z.object({
  nik: z.string().min(1),
  nama: z.string().min(1),

  divisi: z.enum([
    "DIREKSI",
    "MANAGER",
    "ACCOUNTING",
    "PAJAK",
    "PROYEK",
    "ARMADA",
    "KEBUN_SAWIT",
    "ALAT_BERAT",
    "PURCHASING",
    "IT",
    "FINANCE",
  ]),

  jabatan: z.string().min(1),

  gaji_pokok: z.number().nonnegative(),
  tunjangan: z.number().nonnegative(),

  status: z.enum(["AKTIF", "NONAKTIF"]),
});

export type PegawaiInput = z.infer<typeof pegawaiSchema>;
