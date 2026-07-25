import { z } from "zod";

/* ===============================
   SCHEMA
================================ */

export const kasArmadaSchema = z.object({
  tanggal: z.string().min(1),
  sopir: z.string().min(1),

  penerimaan: z.number().min(0),
  pengembalian: z.number().min(0),
  pengeluaran: z.number().min(0),
  kasbon: z.number().min(0),

  status: z.string().optional(),
});

export type KasArmadaInput = z.infer<typeof kasArmadaSchema>;

/* ===============================
   NORMALIZE (ANTI MINUS)
================================ */

export function normalizeKasArmada(input: KasArmadaInput): KasArmadaInput {
  return {
    ...input,
    penerimaan: Math.max(0, input.penerimaan),
    pengembalian: Math.max(0, input.pengembalian),
    pengeluaran: Math.max(0, input.pengeluaran),
    kasbon: Math.max(0, input.kasbon),
  };
}

/* ===============================
   HITUNG KAS ARMADA
================================ */

export type KasArmadaComputed = {
  total_masuk: number;
  total_keluar: number;
  saldo: number;
};

export function hitungKasArmada(data: KasArmadaInput): KasArmadaComputed {
  /* =========================
     MASUK
  ========================= */
  const total_masuk = data.penerimaan + data.pengembalian;

  /* =========================
     KELUAR
  ========================= */
  const total_keluar = data.pengeluaran + data.kasbon;

  /* =========================
     SALDO
  ========================= */
  const saldo = total_masuk - total_keluar;

  return {
    total_masuk,
    total_keluar,
    saldo,
  };
}

/* ===============================
   VALIDASI TAMBAHAN
================================ */

export function validateKasArmada(data: KasArmadaInput): void {
  if (!data.sopir) {
    throw new Error("Sopir wajib diisi");
  }

  const total =
    data.penerimaan + data.pengembalian + data.pengeluaran + data.kasbon;

  if (total <= 0) {
    throw new Error("Transaksi kas armada kosong");
  }
}
