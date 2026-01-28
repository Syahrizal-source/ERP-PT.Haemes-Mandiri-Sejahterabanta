import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db.rpc("report_cash_flow");
  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: "Gagal ambil cash flow" },
      { status: 500 },
    );
  }
  return NextResponse.json(data[0]);
}
