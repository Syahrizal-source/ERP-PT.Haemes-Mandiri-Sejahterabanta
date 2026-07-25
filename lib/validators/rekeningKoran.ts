import { z } from "zod";

/* =========================
   ENUM JENIS
========================= */

export const jenisRekeningKoranEnum = z.enum([
  "MASUK",
  "KELUAR",
  "BIAYA_BANK",
  "PAJAK_BANK",
]);

export type JenisRekeningKoran = z.infer<typeof jenisRekeningKoranEnum>;

/* =========================
   SCHEMA
========================= */

export const rekeningKoranSchema = z
  .object({
    id_rekening: z.number().int().positive("Rekening wajib dipilih"),

    tanggal: z.string().min(1, "Tanggal wajib diisi"),

    deskripsi: z.string().min(1, "Deskripsi wajib diisi"),

    debit: z.number().min(0, "Debit tidak boleh minus"),

    kredit: z.number().min(0, "Kredit tidak boleh minus"),

    saldo: z.number().min(0, "Saldo tidak boleh minus"),

    jenis: jenisRekeningKoranEnum,
  })
  .refine(
    (data) => {
      /* =========================
         HANYA SALAH SATU
      ========================= */
      return !(data.debit > 0 && data.kredit > 0);
    },
    {
      message: "Debit dan kredit tidak boleh terisi bersamaan",
      path: ["debit"],
    },
  );

/* =========================
   TYPE
========================= */

export type RekeningKoranInput = z.infer<typeof rekeningKoranSchema>;

/* =========================
   HELPER NORMALISASI
========================= */

export function normalizeRekeningKoran(
  input: RekeningKoranInput,
): RekeningKoranInput {
  /* =========================
     ANTI MINUS
  ========================= */

  const debit: number = Math.max(0, input.debit);
  const kredit: number = Math.max(0, input.kredit);
  const saldo: number = Math.max(0, input.saldo);

  return {
    ...input,
    debit,
    kredit,
    saldo,
  };
}

/* =========================
   HELPER HITUNG SALDO
========================= */

export function hitungSaldoBaru(
  saldoSebelumnya: number,
  input: RekeningKoranInput,
): number {
  const debit: number = Math.max(0, input.debit);
  const kredit: number = Math.max(0, input.kredit);

  const saldo: number = saldoSebelumnya + debit - kredit;

  return Math.max(0, saldo);
}

/* =========================
   HELPER VALIDASI LOGIKA
========================= */

export function validasiJenis(input: RekeningKoranInput): void {
  const debit: number = Math.max(0, input.debit);
  const kredit: number = Math.max(0, input.kredit);

  /* =========================
     RULE BERDASARKAN JENIS
  ========================= */

  if (input.jenis === "MASUK" && debit <= 0) {
    throw new Error("Transaksi masuk harus memiliki debit");
  }

  if (input.jenis === "KELUAR" && kredit <= 0) {
    throw new Error("Transaksi keluar harus memiliki kredit");
  }

  if (input.jenis === "BIAYA_BANK" && kredit <= 0) {
    throw new Error("Biaya bank harus kredit");
  }

  if (input.jenis === "PAJAK_BANK" && kredit <= 0) {
    throw new Error("Pajak bank harus kredit");
  }
}
