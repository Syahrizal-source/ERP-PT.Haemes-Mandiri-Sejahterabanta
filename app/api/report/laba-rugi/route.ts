import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type LabaRugiResult = {
  pendapatan: number;
  beban: number;
  laba_bersih: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("keterangan,debit,kredit");

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal hitung laba rugi" },
      { status: 500 },
    );
  }

  let pendapatan = 0;
  let beban = 0;

  for (const r of data) {
    const ket = (r.keterangan as string).toLowerCase();

    // ✅ hanya bunga = pendapatan
    if (ket.includes("bunga")) {
      pendapatan += Number(r.debit);
    }

    // ✅ hanya fee/admin/pajak = beban
    if (ket.includes("fee") || ket.includes("admin") || ket.includes("pajak")) {
      beban += Number(r.kredit);
    }
  }

  const result: LabaRugiResult = {
    pendapatan: round2(pendapatan),
    beban: round2(beban),
    laba_bersih: round2(pendapatan - beban),
  };

  return NextResponse.json(result);
}
