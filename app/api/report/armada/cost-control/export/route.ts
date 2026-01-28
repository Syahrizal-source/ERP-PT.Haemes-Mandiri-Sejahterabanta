import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  buildCostControlExcelWithQR,
  CostControlRow,
} from "@/lib/export/cost-control-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("cost_control_armada")
    .select("tanggal, jenis_biaya, nominal")
    .order("tanggal", { ascending: true })
    .returns<CostControlRow[]>();

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: "Gagal ambil cost control armada" },
      { status: 500 },
    );
  }

  const buffer = await buildCostControlExcelWithQR(data);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cost-control-armada.xlsx",
    },
  });
}
