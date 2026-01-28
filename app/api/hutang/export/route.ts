import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildHutangExcelWithQR } from "@/lib/export/hutang-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("hutang")
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data hutang" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id_hutang: r.id_hutang as number,
    supplier: r.supplier as string,
    no_invoice: r.no_invoice as string,
    tanggal: r.tanggal as string,
    jatuh_tempo: r.jatuh_tempo as string,
    nilai: Number(r.nilai),
    status: r.status as string,
  }));

  const buffer = await buildHutangExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=hutang.xlsx",
    },
  });
}
