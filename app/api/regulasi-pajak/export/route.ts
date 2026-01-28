import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildRegulasiPajakExcelWithQR } from "@/lib/export/regulasi-pajak-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("regulasi_pajak")
    .select("kode_pajak,tarif,tahun,versi");

  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
  }

  const buffer = await buildRegulasiPajakExcelWithQR(
    data.map((r) => ({
      kode_pajak: r.kode_pajak as string,
      tarif: Number(r.tarif),
      tahun: r.tahun as number,
      versi: r.versi as number,
    })),
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=regulasi-pajak.xlsx",
    },
  });
}
