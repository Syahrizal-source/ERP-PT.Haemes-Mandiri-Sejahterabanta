import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { exportNeracaExcel } from "@/lib/export/exportNeraca";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const periode = Number(searchParams.get("periode"));
  const idProyek = searchParams.get("id_proyek");

  const { data, error } = await db
    .from("v_neraca_proyek")
    .select("kode,nama,saldo")
    .eq("id_periode", periode)
    .eq("id_proyek", idProyek);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const wb = await exportNeracaExcel(data ?? [], periode);
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=neraca.xlsx",
    },
  });
}
