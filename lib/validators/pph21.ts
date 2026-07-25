import { z } from "zod";

/* =========================
   SCHEMA
========================= */

export const pph21Schema = z.object({
  id_payroll: z.number().int().positive("ID Payroll wajib diisi"),

  nama: z.string().min(1, "Nama wajib diisi"),

  status_ptkp: z.string().min(1, "Status PTKP wajib diisi"),

  gaji_bruto: z.number().positive("Gaji bruto harus lebih dari 0"),

  biaya_jabatan: z.number().min(0, "Biaya jabatan tidak boleh minus"),

  iuran: z.number().min(0, "Iuran tidak boleh minus"),

  tarif_pph21: z.number().min(0, "Tarif pajak tidak boleh minus"),

  thr: z.number().min(0).optional(),

  penghasilan_bruto: z.number().min(0).optional(),

  nilai_pph21: z.number().min(0).optional(),

  tanggal: z.string().min(1, "Tanggal wajib diisi"),
});

/* =========================
   TYPE
========================= */

export type Pph21Input = z.infer<typeof pph21Schema>;

/* =========================
   HASIL PERHITUNGAN
========================= */

export interface HasilHitungPph21 {
  thr: number;
  penghasilan_bruto: number;
  nilai_pph21: number;
}

/* =========================
   HELPER HITUNG (ANTI MINUS)
========================= */

export function hitungPph21(input: Pph21Input): HasilHitungPph21 {
  const gajiBruto = Math.max(0, input.gaji_bruto);

  const biayaJabatan = Math.max(0, input.biaya_jabatan);

  const iuran = Math.max(0, input.iuran);

  const tarif = Math.max(0, input.tarif_pph21);

  /* =========================
     THR = 10% x Gaji
  ========================= */

  const thr = Math.max(0, gajiBruto * 0.1);

  /* =========================
     Penghasilan Bruto
  ========================= */

  const penghasilanBruto = Math.max(0, gajiBruto + thr);

  /* =========================
     Dasar Pajak
  ========================= */

  const dasarPajak = Math.max(0, penghasilanBruto - biayaJabatan - iuran);

  /* =========================
     Nilai PPh21
  ========================= */

  const nilaiPph21 = Math.max(0, dasarPajak * (tarif / 100));

  return {
    thr,
    penghasilan_bruto: penghasilanBruto,
    nilai_pph21: nilaiPph21,
  };
}
