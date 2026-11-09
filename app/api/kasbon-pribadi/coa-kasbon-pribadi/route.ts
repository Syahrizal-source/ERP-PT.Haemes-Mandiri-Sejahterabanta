import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

/**
 * ============================================================
 * RESPONSE COA KAS / BANK KASBON PRIBADI
 * ============================================================
 */
type CoaKasBonPribadiResponse = {
  id_coa: number;
  kode: string;
  nama: string;
};

/**
 * ============================================================
 * GET COA KAS / BANK
 * ============================================================
 *
 * Endpoint:
 *
 *   GET /api/kasbon-pribadi/coa-kasbon-pribadi
 *
 * Digunakan khusus untuk memilih akun Kas / Bank
 * pada transaksi Kasbon Pribadi.
 *
 * Filter:
 *   - aktif = true
 *   - is_cash = true
 *   - is_header = false
 *
 * COA Piutang Karyawan Internal TIDAK diambil di sini.
 *
 * COA Piutang Kasbon Pribadi tetap berasal dari:
 *
 *   KASBON_PRIBADI / PIUTANG
 *          ↓
 *        2518
 *          ↓
 *   12006 Piutang Karyawan Internal
 */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("coa")
    .select("id_coa, kode, nama")
    .eq("aktif", true)
    .eq("is_cash", true)
    .eq("is_header", false)
    .order("kode", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: `Gagal mengambil COA kas/bank Kasbon Pribadi: ` + error.message,
      },
      { status: 500 },
    );
  }

  const result: CoaKasBonPribadiResponse[] = (data ?? [])
    .map((item) => ({
      id_coa: Number(item.id_coa),
      kode: String(item.kode),
      nama: String(item.nama),
    }))
    .filter((item) => Number.isInteger(item.id_coa) && item.id_coa > 0);

  return NextResponse.json(result);
}
