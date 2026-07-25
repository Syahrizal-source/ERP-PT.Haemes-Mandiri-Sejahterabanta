import { z } from "zod";

/* ===============================
   ENUM JENIS PPN
================================ */
export const jenisPpnEnum = z.enum(["keluaran", "masukan"]);

export type JenisPpn = z.infer<typeof jenisPpnEnum>;

/* ===============================
   SCHEMA
================================ */
export const ppnSchema = z.object({
  id_transaksi: z.number().int().positive(),

  jenis_ppn: jenisPpnEnum,

  nilai_dasar: z.number().positive(),

  tarif_ppn: z.number().min(0),

  nilai_ppn: z.number().min(0),

  tanggal_transaksi: z.string().min(1),
  vendor_id: z.number().int().positive().nullable().optional(),

  nomor_seri: z.string().max(50).nullable().optional(),

  keterangan: z.string().nullable().optional(),
});

export type PpnInput = z.infer<typeof ppnSchema>;

/* ===============================
   NORMALIZE (ANTI MINUS)
================================ */
export function normalizePpn(input: PpnInput): PpnInput {
  return {
    ...input,
    nilai_dasar: Math.max(0, input.nilai_dasar),
    tarif_ppn: Math.max(0, input.tarif_ppn),
    nilai_ppn: Math.max(0, input.nilai_ppn),
  };
}

/* ===============================
   HITUNG PPN (RUMUS UTAMA)
================================ */
export type PpnComputed = {
  nilai_ppn: number;
  total: number;
};

export function hitungPpn(data: PpnInput): PpnComputed {
  const nilai_ppn = (data.nilai_dasar * data.tarif_ppn) / 100;

  const nilai_ppn_fix = Math.max(0, nilai_ppn);

  const total = data.nilai_dasar + nilai_ppn_fix;

  return {
    nilai_ppn: nilai_ppn_fix,
    total,
  };
}

/* ===============================
   VALIDASI TAMBAHAN
================================ */
export function validatePpn(data: PpnInput): void {
  if (data.nilai_dasar <= 0) {
    throw new Error("Nilai dasar harus > 0");
  }

  if (data.tarif_ppn < 0) {
    throw new Error("Tarif PPN tidak valid");
  }

  const hitung = hitungPpn(data);

  /* =========================
     VALIDASI NILAI PPN
  ========================= */
  const selisih = Math.abs(data.nilai_ppn - hitung.nilai_ppn);

  if (selisih > 1) {
    throw new Error("Nilai PPN tidak sesuai rumus");
  }
}
