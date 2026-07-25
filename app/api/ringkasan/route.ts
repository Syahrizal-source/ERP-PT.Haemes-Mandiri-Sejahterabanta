import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RingkasanPajakResponse = {
  total_pph21_transaksi: number;
  total_pph21_nilai: number;

  total_pph23_transaksi: number;
  total_pph23_nilai: number;

  total_pph4_transaksi: number;
  total_pph4_nilai: number;

  total_ppn_transaksi: number;
  total_ppn_nilai: number;

  total_semua_transaksi: number;
  total_semua_pajak: number;
};

function sumNumeric<T>(rows: T[] | null, field: keyof T): number {
  if (!rows || rows.length === 0) return 0;

  return rows.reduce((acc: number, row: T) => {
    const value = row[field];

    if (typeof value === "number") return acc + value;
    if (typeof value === "string") return acc + Number(value);

    return acc;
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    /* ======================
       FETCH DATA
    ====================== */

    const { data: pph21 } = await db.from("pph21").select("nilai_pph21");

    const { data: pph23 } = await db.from("pph23").select("pph23_terutang");

    const { data: pph4 } = await db.from("pph4").select("pph4_terutang");

    const { data: ppn } = await db.from("ppn").select("nilai_ppn");

    /* ======================
       HITUNG TOTAL
    ====================== */

    const total_pph21_transaksi = pph21 ? pph21.length : 0;
    const total_pph23_transaksi = pph23 ? pph23.length : 0;
    const total_pph4_transaksi = pph4 ? pph4.length : 0;
    const total_ppn_transaksi = ppn ? ppn.length : 0;

    const total_pph21_nilai = sumNumeric(pph21, "nilai_pph21");
    const total_pph23_nilai = sumNumeric(pph23, "pph23_terutang");
    const total_pph4_nilai = sumNumeric(pph4, "pph4_terutang");
    const total_ppn_nilai = sumNumeric(ppn, "nilai_ppn");

    const total_semua_transaksi =
      total_pph21_transaksi +
      total_pph23_transaksi +
      total_pph4_transaksi +
      total_ppn_transaksi;

    const total_semua_pajak =
      total_pph21_nilai +
      total_pph23_nilai +
      total_pph4_nilai +
      total_ppn_nilai;

    /* ======================
       RESPONSE
    ====================== */

    const response: RingkasanPajakResponse = {
      total_pph21_transaksi,
      total_pph21_nilai,

      total_pph23_transaksi,
      total_pph23_nilai,

      total_pph4_transaksi,
      total_pph4_nilai,

      total_ppn_transaksi,
      total_ppn_nilai,

      total_semua_transaksi,
      total_semua_pajak,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
