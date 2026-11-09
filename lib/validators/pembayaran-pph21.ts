import { z } from "zod";

/**
 * Memvalidasi format tanggal YYYY-MM-DD
 * sekaligus memastikan tanggal tersebut benar-benar valid.
 */
function isValidDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Batas nominal numeric(18, 2) PostgreSQL.
 * Maksimal 16 digit sebelum koma dan 2 digit desimal.
 */
const MAX_NOMINAL = 9999999999999999.99;

/**
 * Validator input pembayaran PPh 21.
 *
 * Sesuai tabel:
 * public.pembayaran_pph21
 *
 * Kolom yang diinput:
 * - tanggal
 * - id_pph21
 * - nominal
 * - keterangan
 * - id_coa_kas
 *
 * Kolom otomatis dari database:
 * - id
 * - id_jurnal
 * - created_at
 */
export const pembayaranPph21Schema = z
  .object({
    tanggal: z
      .string({
        error: "Tanggal pembayaran wajib diisi",
      })
      .trim()
      .min(1, "Tanggal pembayaran wajib diisi")
      .refine(isValidDateOnly, {
        message: "Format tanggal harus valid (YYYY-MM-DD)",
      }),

    id_pph21: z
      .number({
        error: "ID PPh 21 harus berupa angka",
      })
      .int("ID PPh 21 harus berupa bilangan bulat")
      .positive("ID PPh 21 harus lebih besar dari 0")
      .safe("ID PPh 21 tidak valid"),

    nominal: z
      .number({
        error: "Nominal pembayaran harus berupa angka",
      })
      .finite("Nominal pembayaran harus berupa angka yang valid")
      .positive("Nominal pembayaran harus lebih besar dari 0")
      .max(MAX_NOMINAL, "Nominal pembayaran melebihi batas numeric(18, 2)")
      .refine((value) => Number.isInteger(value * 100), {
        message: "Nominal pembayaran maksimal 2 angka desimal",
      }),

    keterangan: z
      .string({
        error: "Keterangan wajib diisi",
      })
      .trim()
      .min(1, "Keterangan wajib diisi"),

    id_coa_kas: z
      .number({
        error: "COA kas/bank harus berupa angka",
      })
      .int("COA kas/bank harus berupa bilangan bulat")
      .positive("COA kas/bank harus lebih besar dari 0")
      .safe("ID COA kas/bank tidak valid"),
  })
  .strict();

/**
 * Tipe data hasil validasi input pembayaran PPh 21.
 */
export type PembayaranPph21Input = z.infer<typeof pembayaranPph21Schema>;

/**
 * Tipe record pembayaran PPh 21 sesuai tabel database.
 */
export interface PembayaranPph21Record {
  id: number;
  tanggal: string;
  id_pph21: number;
  nominal: number;
  keterangan: string;
  id_coa_kas: number;
  id_jurnal: number | null;
  created_at: string;
}
