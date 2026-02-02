import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/supabase/server";
import { exportNeracaAlatExcel } from "@/lib/export/exportNeracaAlat";

export async function GET(req: NextRequest) {
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

    const { data, error } = await db.from("v_neraca_alat").select("*");

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    const workbook: ExcelJS.Workbook = await exportNeracaAlatExcel(
      data,
      periode,
    );

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=neraca-alat-periode-${periode}.xlsx`,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
