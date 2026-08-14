import { z } from "zod";

// =====================================================
// STATUS PIUTANG PROYEK
// =====================================================

export const piutangProyekStatusSchema = z.enum([
  "Unpaid (Menunggu Pembayaran)",
  "Partial (Pembayaran Sebagian)",
  "Paid (Pembayaran Penuh/ Lunas)",
]);

// =====================================================
// INPUT PIUTANG PROYEK
// Digunakan untuk membuat / menghubungkan piutang
// dengan proyek_tagihan
// =====================================================

export const piutangProyekSchema = z.object({
  id_proyek: z.string().uuid("ID proyek tidak valid"),

  id_tagihan: z.string().uuid("ID tagihan tidak valid"),

  tanggal: z.string().min(1, "Tanggal wajib diisi"),

  customer: z.string().trim().min(2, "Customer wajib diisi"),

  tanggal_pembayaran: z.string().nullable(),

  nilai_piutang: z
    .number()
    .finite("Nilai piutang tidak valid")
    .min(0, "Nilai piutang tidak boleh minus"),

  penerimaan: z
    .number()
    .finite("Penerimaan tidak valid")
    .min(0, "Penerimaan tidak boleh minus"),

  keterangan: z.string().nullable(),

  status: piutangProyekStatusSchema,
});

// =====================================================
// VALIDASI PIUTANG PROYEK
// =====================================================

export function validatePiutangProyek(data: PiutangProyekInput): void {
  const nilaiPiutang = Number(data.nilai_piutang);
  const penerimaan = Number(data.penerimaan);

  if (!Number.isFinite(nilaiPiutang) || nilaiPiutang < 0) {
    throw new Error("Nilai piutang tidak valid.");
  }

  if (!Number.isFinite(penerimaan) || penerimaan < 0) {
    throw new Error("Penerimaan tidak valid.");
  }

  if (penerimaan > nilaiPiutang) {
    throw new Error("Penerimaan tidak boleh melebihi nilai piutang.");
  }

  const saldo = nilaiPiutang - penerimaan;

  // ===================================================
  // VALIDASI STATUS
  // ===================================================

  if (saldo === 0 && data.status !== "Paid (Pembayaran Penuh/ Lunas)") {
    throw new Error("Status harus Paid jika saldo sudah 0.");
  }

  if (
    saldo > 0 &&
    penerimaan === 0 &&
    data.status !== "Unpaid (Menunggu Pembayaran)"
  ) {
    throw new Error("Status harus Unpaid jika belum ada pembayaran.");
  }

  if (
    saldo > 0 &&
    penerimaan > 0 &&
    data.status !== "Partial (Pembayaran Sebagian)"
  ) {
    throw new Error("Status harus Partial jika pembayaran sebagian.");
  }
}

// =====================================================
// TYPES
// =====================================================

export type PiutangProyekInput = z.infer<typeof piutangProyekSchema>;

export type PiutangProyekStatus = z.infer<typeof piutangProyekStatusSchema>;
