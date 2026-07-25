import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface CashRow {
  debit: string;
  kredit: string;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("jurnal_detail")
    .select(
      `
      debit,
      kredit,
      jurnal!inner(sumber)
    `,
    )
    .eq("jurnal.sumber", "KAS_ARMADA");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      cash_in: 0,
      cash_out: 0,
      net_cash: 0,
    });
  }

  let cashIn = 0;
  let cashOut = 0;

  for (const row of data as CashRow[]) {
    const debit = Number(row.debit);
    const kredit = Number(row.kredit);

    if (debit > 0) {
      cashIn += debit;
    }

    if (kredit > 0) {
      cashOut += kredit;
    }
  }

  return NextResponse.json({
    cash_in: cashIn,
    cash_out: cashOut,
    net_cash: cashIn - cashOut,
  });
}
