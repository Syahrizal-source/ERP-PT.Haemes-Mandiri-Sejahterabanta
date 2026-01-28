import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { exportCashFlowExcel } from "@/lib/export/exportCashFlow";
import { CashFlowRow } from "@/types/laporan";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periode = Number(searchParams.get("periode"));
  const idProyek = searchParams.get("id_proyek");

  if (!periode || !idProyek) {
    return NextResponse.json(
      { error: "periode dan id_proyek wajib" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("v_cash_flow_proyek")
    .select("masuk,keluar,saldo")
    .eq("id_periode", periode)
    .eq("id_proyek", idProyek);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 🔒 PASTIKAN ARRAY
  const rows: CashFlowRow[] = (data ?? []).map((r) => ({
    masuk: Number(r.masuk),
    keluar: Number(r.keluar),
    saldo: Number(r.saldo),
  }));

  const workbook = await exportCashFlowExcel(rows, periode);
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cash_flow.xlsx",
    },
  });
}
