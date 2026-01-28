import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

/* =====================
   TYPE DEFINITIONS
===================== */

interface OmsetRow {
  tanggal: string;
  no_polisi: string;
  supir: string;
  rit: number;
  jumlah_tagihan: number;
  bersih: number;
}

/* =====================
   EXPORT EXCEL
===================== */

export async function GET() {
  try {
    const { data, error } = await db
      .from("armada")
      .select("tanggal, no_polisi, supir, rit, jumlah_tagihan, bersih")
      .order("tanggal", { ascending: false });

    if (error || !data) {
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Omset Armada");

    /* ===== HEADER ===== */
    sheet.addRow([
      "Tanggal",
      "No Polisi",
      "Supir",
      "Rit",
      "Jumlah Tagihan",
      "Bersih",
    ]);

    sheet.getRow(1).font = { bold: true };

    /* ===== DATA ===== */
    data.forEach((row: OmsetRow) => {
      sheet.addRow([
        row.tanggal,
        row.no_polisi,
        row.supir,
        row.rit,
        row.jumlah_tagihan,
        row.bersih,
      ]);
    });

    /* ===== FORMAT ANGKA ===== */
    sheet.getColumn(5).numFmt = "#,##0.00";
    sheet.getColumn(6).numFmt = "#,##0.00";

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="omset-haemes-mandiri-sejahtera.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT OMSET ERROR:", error);
    return NextResponse.json(
      { message: "Gagal export omset" },
      { status: 500 },
    );
  }
}
