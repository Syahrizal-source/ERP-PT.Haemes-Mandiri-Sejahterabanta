import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPendapatanExcelWithQR } from "@/lib/export/pendapatan-export";

type PendapatanRow = {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  keterangan: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pendapatan")
    .select("id,tanggal,id_coa,nominal,keterangan")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data pendapatan" },
      { status: 500 },
    );
  }

  const rows: PendapatanRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    id_coa: r.id_coa as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  const buffer = await buildPendapatanExcelWithQR(rows);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=pendapatan.xlsx",
    },
  });
}
