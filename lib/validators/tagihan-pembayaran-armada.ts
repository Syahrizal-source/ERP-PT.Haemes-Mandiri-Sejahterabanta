import { z } from "zod";

/**
 * ============================================================
 * VALIDATOR PEMBAYARAN TAGIHAN ARMADA
 * ============================================================
 *
 * Tabel:
 * public.armada_pembayaran_tagihan
 *
 * Struktur database:
 * id                 UUID PRIMARY KEY
 * armada_id          BIGINT NOT NULL
 * tanggal            DATE NOT NULL
 * no_bukti           TEXT NOT NULL UNIQUE
 * nominal            NUMERIC(15,2) NOT NULL
 * metode_pembayaran  TEXT NOT NULL
 * id_coa_kas         BIGINT NULL
 * keterangan         TEXT NULL
 * status             TEXT NOT NULL DEFAULT 'DRAFT'
 * id_jurnal          BIGINT NULL
 * created_at         TIMESTAMPTZ NOT NULL
 * updated_at         TIMESTAMPTZ NOT NULL
 *
 * Tidak mengubah struktur database.
 * Tidak mengubah alur jurnal.
 * Tidak menggunakan any.
 * ============================================================
 */

/**
 * ============================================================
 * STATUS PEMBAYARAN
 * ============================================================
 */

export const armadaPembayaranTagihanStatusSchema = z.enum([
  "DRAFT",
  "POSTED",
  "CANCELLED",
]);

export type ArmadaPembayaranTagihanStatus = z.infer<
  typeof armadaPembayaranTagihanStatusSchema
>;

/**
 * ============================================================
 * VALIDASI ID BIGINT
 * ============================================================
 *
 * Aplikasi menggunakan number.
 * Karena itu ID harus berada dalam batas aman JavaScript.
 */

const positiveSafeIntegerSchema = z
  .number()
  .int("ID harus berupa bilangan bulat.")
  .positive("ID harus lebih dari 0.")
  .refine(
    (value) => Number.isSafeInteger(value),
    "ID melebihi batas aman angka JavaScript.",
  );

/**
 * ============================================================
 * VALIDASI TANGGAL DATABASE DATE
 * ============================================================
 *
 * Format:
 * YYYY-MM-DD
 *
 * Tidak hanya memeriksa format, tetapi juga tanggal kalender.
 */

const tanggalPembayaranSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus menggunakan format YYYY-MM-DD.")
  .refine((value) => {
    const parts = value.split("-");

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return false;
    }

    if (year < 1 || year > 9999 || month < 1 || month > 12) {
      return false;
    }

    const leapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);

    const daysInMonth = [
      31,
      leapYear ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    const maximumDay = daysInMonth[month - 1];

    return day >= 1 && day <= maximumDay;
  }, "Tanggal pembayaran tidak valid.");

/**
 * ============================================================
 * VALIDASI NUMERIC(15,2)
 * ============================================================
 *
 * Maksimal 15 digit:
 * 13 digit sebelum desimal.
 * 2 digit setelah desimal.
 *
 * Nominal wajib lebih dari 0.
 */

const nominalPembayaranSchema = z
  .number()
  .finite("Nominal pembayaran harus berupa angka valid.")
  .positive("Nominal pembayaran harus lebih dari 0.")
  .max(9999999999999.99, "Nominal melebihi batas NUMERIC(15,2).")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Nominal maksimal memiliki 2 angka desimal.",
  );

/**
 * ============================================================
 * SCHEMA UTAMA
 * ============================================================
 *
 * Schema ini digunakan oleh:
 * - Form pembayaran Armada
 * - API pembayaran Armada
 * - Helper accounting pembayaran Armada
 *
 * Kolom database:
 * armada_id
 * tanggal
 * no_bukti
 * nominal
 * metode_pembayaran
 * id_coa_kas
 * keterangan
 * status
 * id_jurnal
 */

export const armadaPembayaranTagihanSchema = z.object({
  armada_id: positiveSafeIntegerSchema,

  tanggal: tanggalPembayaranSchema,

  no_bukti: z.string().trim().min(1, "Nomor bukti pembayaran wajib diisi."),

  nominal: nominalPembayaranSchema,

  metode_pembayaran: z
    .string()
    .trim()
    .min(1, "Metode pembayaran wajib dipilih."),

  id_coa_kas: positiveSafeIntegerSchema.nullable(),

  keterangan: z.string().nullable(),

  status: armadaPembayaranTagihanStatusSchema.default("DRAFT"),

  id_jurnal: positiveSafeIntegerSchema.nullable().default(null),
});

/**
 * ============================================================
 * TYPE INPUT
 * ============================================================
 */

export type ArmadaPembayaranTagihanInput = z.infer<
  typeof armadaPembayaranTagihanSchema
>;

/**
 * ============================================================
 * TYPE DATA DATABASE
 * ============================================================
 *
 * Untuk representasi record yang sudah tersimpan.
 *
 * UUID tetap string.
 * BIGINT direpresentasikan sebagai number sesuai pola
 * aplikasi yang digunakan saat ini.
 */

export interface ArmadaPembayaranTagihanRow {
  id: string;
  armada_id: number;
  tanggal: string;
  no_bukti: string;
  nominal: number;
  metode_pembayaran: string;
  id_coa_kas: number | null;
  keterangan: string | null;
  status: ArmadaPembayaranTagihanStatus;
  id_jurnal: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * ============================================================
 * NORMALIZE
 * ============================================================
 *
 * Normalisasi hanya membersihkan teks.
 *
 * Tidak:
 * - Mengubah nominal.
 * - Mengubah status.
 * - Membuat jurnal.
 * - Mengubah ID COA.
 * - Mengubah ID Armada.
 */

export function normalizeArmadaPembayaranTagihan(
  input: ArmadaPembayaranTagihanInput,
): ArmadaPembayaranTagihanInput {
  return {
    ...input,

    no_bukti: input.no_bukti.trim(),

    metode_pembayaran: input.metode_pembayaran.trim(),

    keterangan:
      input.keterangan === null ? null : input.keterangan.trim() || null,
  };
}

/**
 * ============================================================
 * VALIDASI TAMBAHAN
 * ============================================================
 *
 * Validasi bisnis dasar.
 *
 * Pemeriksaan berikut tetap menjadi tanggung jawab API
 * dan accounting helper:
 *
 * - Armada benar-benar tersedia.
 * - Sisa tagihan belum lunas.
 * - Nominal tidak melebihi sisa tagihan.
 * - Nomor bukti belum digunakan.
 * - COA aktif.
 * - COA merupakan kas/bank.
 * - COA bukan header.
 * - Jurnal berhasil dibuat dan balance.
 */

export function validateArmadaPembayaranTagihan(
  input: ArmadaPembayaranTagihanInput,
): void {
  if (!Number.isSafeInteger(input.armada_id) || input.armada_id <= 0) {
    throw new Error("Armada wajib dipilih.");
  }

  if (!input.tanggal.trim()) {
    throw new Error("Tanggal pembayaran wajib diisi.");
  }

  if (!input.no_bukti.trim()) {
    throw new Error("Nomor bukti pembayaran wajib diisi.");
  }

  if (!Number.isFinite(input.nominal) || input.nominal <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0.");
  }

  if (
    Math.abs(input.nominal * 100 - Math.round(input.nominal * 100)) >= 0.000001
  ) {
    throw new Error("Nominal pembayaran maksimal memiliki 2 angka desimal.");
  }

  if (!input.metode_pembayaran.trim()) {
    throw new Error("Metode pembayaran wajib dipilih.");
  }

  if (
    input.id_coa_kas !== null &&
    (!Number.isSafeInteger(input.id_coa_kas) || input.id_coa_kas <= 0)
  ) {
    throw new Error("COA kas/bank pembayaran tidak valid.");
  }

  if (
    input.id_jurnal !== null &&
    (!Number.isSafeInteger(input.id_jurnal) || input.id_jurnal <= 0)
  ) {
    throw new Error("ID jurnal pembayaran tidak valid.");
  }

  const statusResult = armadaPembayaranTagihanStatusSchema.safeParse(
    input.status,
  );

  if (!statusResult.success) {
    throw new Error("Status pembayaran Armada tidak valid.");
  }
}
