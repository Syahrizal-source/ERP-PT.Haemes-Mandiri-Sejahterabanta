import { z } from "zod";

/**
 * ============================================================
 * VALIDATOR PEMBAYARAN PPH4
 * ============================================================
 *
 * Tabel: public.pembayaran_pph4
 *
 * Kolom database:
 * id          : bigint (identity)
 * tanggal     : date
 * id_pph4     : bigint
 * nominal     : numeric(18,2)
 * keterangan  : text
 * id_coa_kas  : bigint
 * id_jurnal   : bigint | null
 * created_at  : timestamptz
 *
 * Payload form:
 * tanggal
 * id_pph4
 * nominal
 * keterangan
 * id_coa_kas
 *
 * id, id_jurnal, created_at dibuat backend/database.
 * COA hutang ditentukan backend melalui coa_mapping.
 * ============================================================
 */

/**
 * Memastikan tanggal menggunakan format YYYY-MM-DD
 * dan merupakan tanggal kalender yang benar.
 */
function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validasi tanggal pembayaran.
 */
const tanggalSchema = z
  .string()
  .trim()
  .min(1, "Tanggal pembayaran wajib diisi")
  .refine(
    isValidDateOnly,
    "Tanggal pembayaran tidak valid. Gunakan format YYYY-MM-DD",
  );

/**
 * Validasi ID PPh4.
 */
const idPph4Schema = z
  .number({
    error: "Data PPh4 tidak valid",
  })
  .int("ID PPh4 harus berupa bilangan bulat")
  .positive("Data PPh4 wajib dipilih")
  .safe();

/**
 * Validasi nominal pembayaran.
 *
 * numeric(18,2):
 * - Maksimal 16 digit sebelum desimal.
 * - Maksimal 2 angka desimal.
 * - Harus lebih besar dari nol.
 */
const nominalSchema = z
  .number({
    error: "Nominal pembayaran harus berupa angka",
  })
  .finite("Nominal pembayaran tidak valid")
  .positive("Nominal pembayaran harus lebih besar dari nol")
  .max(9999999999999999.99, "Nominal pembayaran melebihi batas database")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Nominal pembayaran maksimal 2 angka desimal",
  );

/**
 * Validasi keterangan.
 */
const keteranganSchema = z
  .string()
  .trim()
  .min(1, "Keterangan pembayaran wajib diisi");

/**
 * Validasi COA kas/bank.
 *
 * Validasi aktif, is_cash, is_header, dan mapping
 * tetap dilakukan backend.
 */
const idCoaKasSchema = z
  .number({
    error: "COA kas/bank tidak valid",
  })
  .int("COA kas/bank harus berupa bilangan bulat")
  .positive("COA kas/bank wajib dipilih")
  .safe();

/**
 * ============================================================
 * SCHEMA INPUT PEMBAYARAN PPH4
 * ============================================================
 */
export const pembayaranPph4Schema = z
  .object({
    tanggal: tanggalSchema,
    id_pph4: idPph4Schema,
    nominal: nominalSchema,
    keterangan: keteranganSchema,
    id_coa_kas: idCoaKasSchema,
  })
  .strict();

/**
 * Type payload pembayaran.
 */
export type PembayaranPph4Input = z.infer<typeof pembayaranPph4Schema>;

/**
 * Type record pembayaran dari database.
 */
export interface PembayaranPph4Record {
  id: number;
  tanggal: string;
  id_pph4: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}
