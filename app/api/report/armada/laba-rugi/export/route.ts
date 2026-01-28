import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildLabaRugiExcelWithQR } from "@/lib/export/laba-rugi-export";

type LabaRugiRow = {
  tipe: "PENDAPATAN" | "BEBAN";
  saldo: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("report_laba_rugi_armada")
    .select("tipe, saldo")
    .returns<LabaRugiRow[]>();

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: "Gagal ambil laba rugi armada" },
      { status: 500 },
    );
  }

  const pendapatan = data.find((r) => r.tipe === "PENDAPATAN")?.saldo ?? 0;
  const beban = data.find((r) => r.tipe === "BEBAN")?.saldo ?? 0;

  const buffer = await buildLabaRugiExcelWithQR(pendapatan, beban);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=laba-rugi-armada.xlsx",
    },
  });
}
