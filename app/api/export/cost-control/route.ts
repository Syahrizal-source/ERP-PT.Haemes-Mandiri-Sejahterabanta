import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { exportCostControlExcel } from "@/lib/export/exportCostControl";
import { CostControlRow } from "@/types/laporan";

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
    .from("v_cost_control")
    .select("item,rab,realisasi")
    .eq("id_proyek", idProyek);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: CostControlRow[] = (data ?? []).map((r) => {
    const rab = Number(r.rab);
    const realisasi = Number(r.realisasi);
    return {
      item: r.item,
      rab,
      realisasi,
      selisih: rab - realisasi,
      status: realisasi > rab ? "OVER BUDGET" : "OK",
    };
  });

  const wb = await exportCostControlExcel(rows, periode);
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cost_control.xlsx",
    },
  });
}
