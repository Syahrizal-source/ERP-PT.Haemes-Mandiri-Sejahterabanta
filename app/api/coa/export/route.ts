import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import * as QRCode from "qrcode";
import { db } from "@/lib/supabase/server";
import type { CoaExcelRow } from "@/types/coaexcel";

/* ===============================
   GET EXPORT COA EXCEL + QR
================================ */
export async function GET() {
  try {
    const { data, error } = await db
      .from("coa")
      .select("kode,nama,tipe,aktif,is_cash")
      .order("kode");

    if (error || !data) {
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("COA");

    /* ===== HEADER ===== */
    sheet.columns = [
      { header: "Kode", key: "kode", width: 15 },
      { header: "Nama Akun", key: "nama", width: 35 },
      { header: "Tipe", key: "tipe", width: 18 },
      { header: "Aktif", key: "aktif", width: 10 },
      { header: "Kas", key: "is_cash", width: 10 },
    ];

    sheet.getRow(1).font = { bold: true };

    /* ===== DATA ===== */
    data.forEach((row: CoaExcelRow) => {
      sheet.addRow({
        kode: row.kode,
        nama: row.nama,
        tipe: row.tipe,
        aktif: row.aktif ? "YA" : "TIDAK",
        is_cash: row.is_cash ? "YA" : "TIDAK",
      });
    });

    /* ===== QR CODE ===== */
    const qrText =
      "Chart of Account (COA) - Accounting System - Haemes Mandiri Sejahtera";

    const qrBase64 = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 1,
    });

    const imageId = workbook.addImage({
      base64: qrBase64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 6, row: 1 },
      ext: { width: 150, height: 150 },
    });

    /* ===== RESPONSE ===== */
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="coa.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT COA ERROR:", error);
    return NextResponse.json({ message: "Gagal export COA" }, { status: 500 });
  }
}
