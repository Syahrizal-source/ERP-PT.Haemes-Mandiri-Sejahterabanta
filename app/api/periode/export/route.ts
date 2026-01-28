import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

/* ===============================
   SETUP SUPABASE
================================ */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/* ===============================
   TYPES
================================ */
type PeriodeStatus = "OPEN" | "CLOSED";

interface PeriodeExcelRow {
  id_periode: string;
  nama_periode: string;
  status: PeriodeStatus;
  created_at: string;
}

/* ===============================
   EXPORT PERIODE EXCEL + QR
================================ */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from<PeriodeExcelRow>("periode")
      .select("id_periode, nama_periode, status, created_at")
      .order("created_at", { ascending: false });

    if (error || !data) {
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Periode");

    // ===== HEADER =====
    sheet.addRow(["ID Periode", "Nama Periode", "Status", "Dibuat"]);
    sheet.getRow(1).font = { bold: true };

    // ===== DATA =====
    data.forEach((row) => {
      sheet.addRow([
        row.id_periode,
        row.nama_periode,
        row.status,
        new Date(row.created_at).toLocaleDateString("id-ID"),
      ]);
    });

    // ===== QR CODE =====
    const qrText = "Periode Accounting - Haemes Mandiri Sejahtera";

    const qrBase64 = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 1,
    });

    const imageId = workbook.addImage({
      base64: qrBase64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 5, row: 1 },
      ext: { width: 150, height: 150 },
    });

    // ===== RESPONSE =====
    const buffer: Buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="periode.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT PERIODE ERROR:", error);
    return NextResponse.json(
      { message: "Gagal export periode" },
      { status: 500 },
    );
  }
}
