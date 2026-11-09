import { z } from "zod";

/* ============================================================
   KONSTANTA SESUAI CONSTRAINT DATABASE
============================================================ */

export const JENIS_PAJAK_PENDAPATAN_PROYEK = [
  "FINAL_PPH42",
  "NON_FINAL_PPH23",
] as const;

export const JENIS_TRANSAKSI_PENDAPATAN_PROYEK = [
  "TUNAI",
  "TERMIN",
  "PENERIMAAN_PIUTANG",
  "UANG_MUKA",
  "REALISASI_UANG_MUKA",
] as const;

export const KLASIFIKASI_PENDAPATAN_PROYEK = ["FINAL", "NON_FINAL"] as const;

/* ============================================================
   TYPE
============================================================ */

export type JenisPajakPendapatanProyek =
  (typeof JENIS_PAJAK_PENDAPATAN_PROYEK)[number];

export type JenisTransaksiPendapatanProyek =
  (typeof JENIS_TRANSAKSI_PENDAPATAN_PROYEK)[number];

export type KlasifikasiPendapatanProyek =
  (typeof KLASIFIKASI_PENDAPATAN_PROYEK)[number];

/*
 * Alias kompatibilitas untuk halaman atau file lama.
 * Tidak membuat tipe baru dan tetap menggunakan union yang sama.
 */
export type JenisPajakPendapatan = JenisPajakPendapatanProyek;
export type JenisTransaksiPendapatan = JenisTransaksiPendapatanProyek;

/* ============================================================
   VALIDASI TANGGAL
============================================================ */

const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus menggunakan format YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Tanggal tidak valid");

/* ============================================================
   VALIDASI NOMINAL NUMERIC(18,2)
============================================================ */

const nominalSchema = z
  .number({
    error: "Nominal harus berupa angka",
  })
  .finite("Nominal harus berupa angka valid")
  .min(0, "Nominal tidak boleh negatif")
  .max(9999999999999999.99, "Nominal melebihi batas database")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Nominal maksimal memiliki 2 angka desimal",
  );

/* ============================================================
   SCHEMA REQUEST
============================================================ */

export const pendapatanProyekSchema = z
  .object({
    id_proyek: z.string().uuid("ID proyek harus berupa UUID yang valid"),

    tanggal: tanggalSchema,

    no_bukti: z
      .string()
      .trim()
      .min(1, "Nomor bukti wajib diisi")
      .max(255, "Nomor bukti terlalu panjang"),

    keterangan: z.string().trim().nullable().optional(),

    nilai_pendapatan: nominalSchema.refine(
      (value) => value > 0,
      "Nilai transaksi harus lebih besar dari 0",
    ),

    jenis_pajak: z.enum(JENIS_PAJAK_PENDAPATAN_PROYEK, {
      error: "Jenis pajak tidak valid",
    }),

    tarif_pajak: nominalSchema.optional(),

    nilai_pajak: nominalSchema.optional(),

    nilai_bersih: nominalSchema.optional(),

    jenis_transaksi: z
      .enum(JENIS_TRANSAKSI_PENDAPATAN_PROYEK)
      .default("TERMIN"),

    klasifikasi_pendapatan: z
      .enum(KLASIFIKASI_PENDAPATAN_PROYEK)
      .nullable()
      .optional(),

    kode_pajak: z.string().trim().nullable().optional(),

    dpp_pajak: nominalSchema.nullable().optional(),

    tanggal_regulasi_pajak: tanggalSchema.nullable().optional(),
  })
  .strict();

/* ============================================================
   INPUT TYPE
============================================================ */

export type PendapatanProyekInput = z.infer<typeof pendapatanProyekSchema>;

/* ============================================================
   NORMALIZED TYPE
============================================================ */

export interface NormalizedPendapatanProyek {
  id_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan: string | null;
  nilai_pendapatan: number;
  jenis_pajak: JenisPajakPendapatanProyek;
  tarif_pajak: number;
  nilai_pajak?: number;
  nilai_bersih?: number;
  jenis_transaksi: JenisTransaksiPendapatanProyek;
  klasifikasi_pendapatan: KlasifikasiPendapatanProyek | null;
  kode_pajak: string | null;
  dpp_pajak: number | null;
  tanggal_regulasi_pajak: string | null;
}

/* ============================================================
   HASIL PERHITUNGAN
============================================================ */

export interface HasilHitungPendapatanProyek {
  tarif_pajak: number;
  nilai_pajak: number;
  nilai_bersih: number;
}

/* ============================================================
   HELPER TRANSAKSI PENGAKUAN PENDAPATAN
============================================================ */

export function isTransaksiPengakuanPendapatan(
  jenisTransaksi: JenisTransaksiPendapatanProyek,
): boolean {
  return (
    jenisTransaksi === "TUNAI" ||
    jenisTransaksi === "TERMIN" ||
    jenisTransaksi === "REALISASI_UANG_MUKA"
  );
}

/* ============================================================
   NORMALIZE DATA
============================================================ */

export function normalizePendapatanProyek(
  input: PendapatanProyekInput,
): NormalizedPendapatanProyek {
  const klasifikasi =
    input.klasifikasi_pendapatan ??
    (input.jenis_pajak === "FINAL_PPH42" ? "FINAL" : "NON_FINAL");

  const dppPajak = input.dpp_pajak ?? input.nilai_pendapatan;

  const tarifPajak = input.jenis_pajak === "FINAL_PPH42" ? 2.65 : 2.0;

  return {
    id_proyek: input.id_proyek,
    tanggal: input.tanggal,
    no_bukti: input.no_bukti.trim(),
    keterangan: input.keterangan?.trim() || null,

    nilai_pendapatan: Number(input.nilai_pendapatan.toFixed(2)),

    jenis_pajak: input.jenis_pajak,
    tarif_pajak: tarifPajak,
    jenis_transaksi: input.jenis_transaksi,

    klasifikasi_pendapatan: klasifikasi,
    kode_pajak: input.kode_pajak?.trim() || null,

    dpp_pajak: dppPajak === null ? null : Number(dppPajak.toFixed(2)),

    tanggal_regulasi_pajak: input.tanggal_regulasi_pajak ?? null,
  };
}

/* ============================================================
   VALIDASI BUSINESS RULE
============================================================ */

export function validatePendapatanProyek(
  input: NormalizedPendapatanProyek,
): void {
  if (!input.id_proyek) {
    throw new Error("Proyek wajib dipilih");
  }

  if (!input.no_bukti.trim()) {
    throw new Error("Nomor bukti wajib diisi");
  }

  if (!Number.isFinite(input.nilai_pendapatan) || input.nilai_pendapatan <= 0) {
    throw new Error("Nilai transaksi harus lebih besar dari 0");
  }

  if (!Number.isFinite(input.tarif_pajak) || input.tarif_pajak < 0) {
    throw new Error("Tarif pajak tidak valid");
  }

  const tarifSeharusnya = input.jenis_pajak === "FINAL_PPH42" ? 2.65 : 2.0;

  if (input.tarif_pajak !== tarifSeharusnya) {
    throw new Error(`Tarif pajak ${input.jenis_pajak} tidak sesuai`);
  }

  if (
    input.dpp_pajak !== null &&
    input.dpp_pajak !== undefined &&
    (!Number.isFinite(input.dpp_pajak) || input.dpp_pajak < 0)
  ) {
    throw new Error("DPP pajak tidak valid");
  }

  if (
    input.klasifikasi_pendapatan !== null &&
    input.klasifikasi_pendapatan !== "FINAL" &&
    input.klasifikasi_pendapatan !== "NON_FINAL"
  ) {
    throw new Error("Klasifikasi pendapatan tidak valid");
  }
}

/* ============================================================
   HITUNG PAJAK PENDAPATAN PROYEK
============================================================ */

export function hitungPendapatanProyek(
  input: NormalizedPendapatanProyek,
): HasilHitungPendapatanProyek {
  validatePendapatanProyek(input);

  const nilaiPendapatan = Number(input.nilai_pendapatan.toFixed(2));

  const tarifPajak = input.jenis_pajak === "FINAL_PPH42" ? 2.65 : 2.0;

  /*
   * UANG_MUKA dan PENERIMAAN_PIUTANG bukan pengakuan
   * pendapatan baru. Karena itu pajaknya tidak dihitung
   * pada transaksi tersebut.
   */
  if (!isTransaksiPengakuanPendapatan(input.jenis_transaksi)) {
    return {
      tarif_pajak: tarifPajak,
      nilai_pajak: 0,
      nilai_bersih: nilaiPendapatan,
    };
  }

  const dasarPajak = Number((input.dpp_pajak ?? nilaiPendapatan).toFixed(2));

  const nilaiPajak = Number((dasarPajak * (tarifPajak / 100)).toFixed(2));

  const nilaiBersih = Number((nilaiPendapatan - nilaiPajak).toFixed(2));

  if (!Number.isFinite(nilaiPajak) || !Number.isFinite(nilaiBersih)) {
    throw new Error("Hasil perhitungan pendapatan proyek tidak valid");
  }

  if (nilaiPajak < 0 || nilaiBersih < 0) {
    throw new Error(
      "Hasil perhitungan pajak atau pendapatan bersih tidak valid",
    );
  }

  return {
    tarif_pajak: tarifPajak,
    nilai_pajak: nilaiPajak,
    nilai_bersih: nilaiBersih,
  };
}

/* ============================================================
   DATABASE RECORD
============================================================ */

export interface PendapatanProyekRecord {
  id: number;
  id_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan: string | null;
  nilai_pendapatan: number;
  jenis_pajak: JenisPajakPendapatanProyek;
  tarif_pajak: number;
  nilai_pajak: number;
  nilai_bersih: number;
  id_jurnal: number | null;
  created_at: string;
  updated_at: string;
  jenis_transaksi: JenisTransaksiPendapatanProyek;
  klasifikasi_pendapatan: KlasifikasiPendapatanProyek | null;
  kode_pajak: string | null;
  dpp_pajak: number | null;
  tanggal_regulasi_pajak: string | null;
}
