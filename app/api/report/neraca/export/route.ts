import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildNeracaExcelWithQR } from "@/lib/export/neraca-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("saldo")
    .order("tanggal", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil saldo akhir" },
      { status: 500 },
    );
  }

  const aset = Number(data.saldo);
  const ekuitas = aset;

  const buffer = await buildNeracaExcelWithQR(aset, ekuitas);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=neraca.xlsx",
    },
  });
}
