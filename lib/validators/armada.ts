import { z } from "zod";

/* ===============================
   SCHEMA
================================ */

export const armadaSchema = z.object({
  user_id: z.number().int().positive().optional(),

  tanggal: z.string().min(1),
  kode_transaksi: z.string().min(1),

  no_polisi: z.string().min(1),
  no_pintu: z.string().min(1),

  supir: z.string().min(1),
  hp: z.string().nullable().optional(),

  buangan_galian: z.string().min(1),

  m3: z.number().min(0),
  rit: z.number().int().positive(),

  tagihan: z.number().min(0),
  uang_jalan: z.number().min(0),
  belanja: z.number().min(0),

  do_qty: z.number().min(0),
  mel: z.number().min(0),
  tambal_ban: z.number().min(0),
  inap_um: z.number().min(0),
  sub_bak_besar: z.number().min(0),
  perg_solar: z.number().min(0),
  kaca_film_bemper: z.number().min(0),
  sparepart: z.number().min(0),
  koordinasi: z.number().min(0),
  adm: z.number().min(0),
  stnk_kir: z.number().min(0),

  status: z.string().optional(),
});

export type ArmadaInput = z.infer<typeof armadaSchema>;

/* ===============================
   NORMALIZE (ANTI MINUS)
================================ */

export function normalizeArmada(input: ArmadaInput): ArmadaInput {
  return {
    ...input,
    m3: Math.max(0, input.m3),
    tagihan: Math.max(0, input.tagihan),
    uang_jalan: Math.max(0, input.uang_jalan),
    belanja: Math.max(0, input.belanja),
    do_qty: Math.max(0, input.do_qty),
    mel: Math.max(0, input.mel),
    tambal_ban: Math.max(0, input.tambal_ban),
    inap_um: Math.max(0, input.inap_um),
    sub_bak_besar: Math.max(0, input.sub_bak_besar),
    perg_solar: Math.max(0, input.perg_solar),
    kaca_film_bemper: Math.max(0, input.kaca_film_bemper),
    sparepart: Math.max(0, input.sparepart),
    koordinasi: Math.max(0, input.koordinasi),
    adm: Math.max(0, input.adm),
    stnk_kir: Math.max(0, input.stnk_kir),
  };
}

/* ===============================
   HITUNG ARMADA (SAMA DENGAN DB)
================================ */

export type ArmadaComputed = {
  jumlah_tagihan: number;
  jumlah_uang_jalan: number;
  jumlah_do: number;
  bersih: number;
};

export function hitungArmada(data: ArmadaInput): ArmadaComputed {
  /* =========================
     TOTAL TAGIHAN
  ========================= */
  const jumlah_tagihan = data.tagihan;

  /* =========================
     TOTAL UANG JALAN + BIAYA
  ========================= */
  const jumlah_uang_jalan =
    data.uang_jalan +
    data.belanja +
    data.mel +
    data.tambal_ban +
    data.inap_um +
    data.sub_bak_besar +
    data.perg_solar +
    data.kaca_film_bemper +
    data.sparepart +
    data.koordinasi +
    data.adm +
    data.stnk_kir;

  /* =========================
     TOTAL DO
  ========================= */
  const jumlah_do = data.do_qty;

  /* =========================
     LABA BERSIH
  ========================= */
  const bersih = jumlah_tagihan - jumlah_uang_jalan - jumlah_do;

  return {
    jumlah_tagihan,
    jumlah_uang_jalan,
    jumlah_do,
    bersih,
  };
}

/* ===============================
   VALIDASI TAMBAHAN
================================ */

export function validateArmada(data: ArmadaInput): void {
  if (data.rit <= 0) {
    throw new Error("Rit harus lebih dari 0");
  }

  if (!data.no_polisi) {
    throw new Error("No Polisi wajib diisi");
  }

  if (!data.supir) {
    throw new Error("Supir wajib diisi");
  }
}
