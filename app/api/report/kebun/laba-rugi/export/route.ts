import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import { exportLabaRugiKebunExcel } from "@/lib/export/exportLabaRugiKebun";
import { LabaRugiKebunRow } from "@/types/kebun";

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

    const periode: number = Number(periodeParam);

    if (Number.isNaN(periode)) {
      return NextResponse.json(
        { message: "Periode tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("v_laba_rugi_kebun")
      .select("*")
      .eq("id_periode", periode);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    const rows: LabaRugiKebunRow[] = data.map((row) => ({
      id_periode: Number(row.id_periode),
      region_name: String(row.region_name),
      total_pendapatan: Number(row.total_pendapatan ?? 0),
      total_beban: Number(row.total_beban ?? 0),
      laba_bersih: Number(row.laba_bersih ?? 0),
    }));

    const workbook: ExcelJS.Workbook = await exportLabaRugiKebunExcel(
      rows,
      periode,
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=laba-rugi-kebun-periode-${periode}.xlsx`,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
