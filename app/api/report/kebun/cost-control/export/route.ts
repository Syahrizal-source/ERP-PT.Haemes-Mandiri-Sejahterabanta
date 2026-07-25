import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import {
  exportCostControlKebunExcel,
  CostControlKebunRow,
} from "@/lib/export/exportCostControlKebun";

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
      .from("v_cost_control_kebun")
      .select("*")
      .eq("id_periode", periode)
      .order("region_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    const typedData: CostControlKebunRow[] = data.map((row) => ({
      id_periode: Number(row.id_periode),
      region_id: String(row.region_id),
      region_name: String(row.region_name),
      total_cost: Number(row.total_cost ?? 0),
    }));

    const workbook: ExcelJS.Workbook = await exportCostControlKebunExcel(
      typedData,
      periode,
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=cost-control-kebun-periode-${periode}.xlsx`,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
