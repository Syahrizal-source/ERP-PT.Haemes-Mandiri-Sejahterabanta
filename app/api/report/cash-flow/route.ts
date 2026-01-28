import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type CashFlowResult = {
  cash_in: number;
  cash_out: number;
  net_cash: number;
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
      { error: error?.message ?? "Gagal hitung cash flow" },
      { status: 500 },
    );
  }

  let cashIn = 0;
  let cashOut = 0;

  for (const r of data) {
    const ket = (r.keterangan as string).toLowerCase();

    // ⛔ exclude opening balance
    if (ket.includes("opening")) continue;

    cashIn += Number(r.debit);
    cashOut += Number(r.kredit);
  }

  const result: CashFlowResult = {
    cash_in: round2(cashIn),
    cash_out: round2(cashOut),
    net_cash: round2(cashIn - cashOut),
  };

  return NextResponse.json(result);
}
