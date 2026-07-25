import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import { exportCashFlowKebunExcel } from "@/lib/export/exportCashFlowKebun";
import { CashFlowKebunRow } from "@/lib/export/exportCashFlowKebun";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const periodeParam = searchParams.get("periode");

    if (!periodeParam) {
      return NextResponse.json(
        { message: "Periode wajib diisi" },
        { status: 400 },
      );
    }

    const periode = Number(periodeParam);

    if (Number.isNaN(periode)) {
      return NextResponse.json(
        { message: "Periode tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("v_cash_flow_kebun")
      .select("*")
      .eq("id_periode", periode)
      .order("tanggal", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    const typedData: CashFlowKebunRow[] = data.map((row) => ({
      id_periode: Number(row.id_periode),
      region_id: String(row.region_id),
      region_name: String(row.region_name),
      tanggal: String(row.tanggal),
      no_bukti: String(row.no_bukti),
      kas_masuk: Number(row.kas_masuk ?? 0),
      kas_keluar: Number(row.kas_keluar ?? 0),
      net_cash: Number(row.net_cash ?? 0),
    }));

    const workbook: ExcelJS.Workbook = await exportCashFlowKebunExcel(
      typedData,
      periode,
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=cash-flow-kebun-periode-${periode}.xlsx`,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
