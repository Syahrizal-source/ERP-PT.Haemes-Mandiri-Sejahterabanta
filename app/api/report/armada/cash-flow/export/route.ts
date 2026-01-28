import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildCashFlowExcelWithQR } from "@/lib/export/cashflow-export";

type CashFlowArmadaRow = {
  cash_in: number;
  cash_out: number;
  net_cash: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("report_cash_flow_armada")
    .select("cash_in, cash_out, net_cash")
    .single<CashFlowArmadaRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil cash flow armada" },
      { status: 500 },
    );
  }

  const buffer = await buildCashFlowExcelWithQR(
    data.cash_in,
    data.cash_out,
    data.net_cash,
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cash-flow-armada.xlsx",
    },
  });
}
