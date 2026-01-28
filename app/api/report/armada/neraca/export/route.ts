import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildNeracaExcelWithQR } from "@/lib/export/neraca-export";

type NeracaRow = {
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("report_neraca_armada")
    .select("tipe, saldo")
    .returns<NeracaRow[]>();

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: "Gagal ambil neraca armada" },
      { status: 500 },
    );
  }

  const aset = data.find((r) => r.tipe === "ASET")?.saldo ?? 0;
  const liabilitas = data.find((r) => r.tipe === "LIABILITAS")?.saldo ?? 0;
  const ekuitas = data.find((r) => r.tipe === "EKUITAS")?.saldo ?? 0;

  const buffer = await buildNeracaExcelWithQR(aset, ekuitas, liabilitas);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=neraca-armada.xlsx",
    },
  });
}
