import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import * as QRCode from "qrcode";

/* ===============================
   TYPES
================================ */
interface AdministrasiExcelRow {
  tanggal: string;
  deskripsi: string;
  periode: string;
}

/* ===============================
   GET EXPORT EXCEL + QR
================================ */
export async function GET() {
  try {
    const { data, error } = await db
      .from("administrasi")
      .select("tanggal, deskripsi, periode")
      .order("tanggal", { ascending: false });

    if (error || !data) {
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Administrasi");

    /* ===== HEADER ===== */
    sheet.addRow(["Tanggal", "Deskripsi", "Periode"]);
    sheet.getRow(1).font = { bold: true };

    /* ===== DATA ===== */
    data.forEach((row: AdministrasiExcelRow) => {
      sheet.addRow([row.tanggal, row.deskripsi, row.periode]);
    });

    /* ===== QR CODE ===== */
    const qrText: string = "Administrasi Accounting - Haemes Mandiri Sejahtera";

    const qrBase64: string = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 1,
    });

    const imageId = workbook.addImage({
      base64: qrBase64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 4, row: 1 },
      ext: { width: 150, height: 150 },
    });

    /* ===== RESPONSE ===== */
    const buffer: Buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="administrasi-accounting.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT ADMINISTRASI ERROR:", error);
    return NextResponse.json(
      { message: "Gagal export administrasi" },
      { status: 500 },
    );
  }
}
