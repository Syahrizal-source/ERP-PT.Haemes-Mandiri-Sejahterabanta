import { z } from "zod";

/* =========================
   STATUS PIUTANG PROYEK
========================= */

export const piutangProyekStatusSchema = z.enum([
  "Unpaid (Menunggu Pembayaran)",

  "Partial (Pembayaran Sebagian)",

  "Paid (Pembayaran Penuh/ Lunas)",
]);

/* =========================
   PIUTANG PROYEK SCHEMA
========================= */

export const piutangProyekSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  customer: z.string().min(2, "Customer wajib diisi"),

  tanggal_pembayaran: z.string().nullable(),

  nilai_piutang: z.number().min(0, "Nilai piutang tidak valid"),

  penerimaan: z.number().min(0, "Penerimaan tidak valid"),

  saldo: z.number().min(0, "Saldo tidak valid"),

  keterangan: z.string().nullable(),

  status: piutangProyekStatusSchema,
});

/* =========================
   VALIDASI SALDO
========================= */

export function validatePiutangProyek(data: PiutangProyekInput): void {
  const saldo = Number(data.nilai_piutang) - Number(data.penerimaan);

  if (saldo !== Number(data.saldo)) {
    throw new Error("Saldo piutang tidak sesuai");
  }

  if (Number(data.penerimaan) > Number(data.nilai_piutang)) {
    throw new Error("Penerimaan tidak boleh melebihi nilai piutang");
  }

  /* =========================
     VALIDASI STATUS
  ========================= */

  if (saldo === 0 && data.status !== "Paid (Pembayaran Penuh/ Lunas)") {
    throw new Error("Status harus Paid jika saldo 0");
  }

  if (
    saldo > 0 &&
    Number(data.penerimaan) === 0 &&
    data.status !== "Unpaid (Menunggu Pembayaran)"
  ) {
    throw new Error("Status harus Unpaid jika belum ada pembayaran");
  }

  if (
    saldo > 0 &&
    Number(data.penerimaan) > 0 &&
    data.status !== "Partial (Pembayaran Sebagian)"
  ) {
    throw new Error("Status harus Partial jika pembayaran sebagian");
  }
}

/* =========================
   TYPES
========================= */

export type PiutangProyekInput = z.infer<typeof piutangProyekSchema>;

export type PiutangProyekStatus = z.infer<typeof piutangProyekStatusSchema>;
