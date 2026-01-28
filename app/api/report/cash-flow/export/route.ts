import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildCashFlowExcelWithQR } from "@/lib/export/cashflow-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("debit,kredit");

  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }

  const cashIn = data.reduce((s, r) => s + Number(r.debit), 0);
  const cashOut = data.reduce((s, r) => s + Number(r.kredit), 0);

  const buffer = await buildCashFlowExcelWithQR(cashIn, cashOut);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cashflow.xlsx",
    },
  });
}
