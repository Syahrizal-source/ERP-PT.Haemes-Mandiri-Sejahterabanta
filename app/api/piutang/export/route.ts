import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPiutangExcelWithQR } from "@/lib/export/piutang-export";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("piutang")
    .select("id_piutang,customer,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data piutang" },
      { status: 500 },
    );
  }

  const rows = data.map((r) => ({
    id_piutang: r.id_piutang as number,
    customer: r.customer as string,
    no_invoice: r.no_invoice as string,
    tanggal: r.tanggal as string,
    jatuh_tempo: r.jatuh_tempo as string,
    nilai: Number(r.nilai),
    status: r.status as string,
  }));

  const buffer = await buildPiutangExcelWithQR(rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=piutang.xlsx",
    },
  });
}
