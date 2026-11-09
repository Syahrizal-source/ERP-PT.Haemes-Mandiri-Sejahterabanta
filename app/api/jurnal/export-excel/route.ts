import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import * as QRCode from "qrcode";

/* ===============================
   TYPES
================================ */
interface JurnalExcelRow {
  tanggal: string;
  no_bukti: string;
  sumber: string;
  keterangan: string;
  debit: number;
  kredit: number;
}

/* ===============================
   GET EXPORT EXCEL + QR
================================ */
export async function GET() {
  try {
    const { data, error } = await db
      .from("jurnal")
      .select(
        `
        tanggal,
        no_bukti,
        sumber,
        keterangan,
        jurnal_detail (
          debit,
          kredit
        )
      `,
      )
      .order("tanggal", { ascending: false });

    if (error || !data) {
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Jurnal");

    /* ===== HEADER ===== */
    sheet.addRow([
      "Tanggal",
      "No Bukti",
      "Sumber",
      "Keterangan",
      "Debit",
      "Kredit",
    ]);
    sheet.getRow(1).font = { bold: true };

    /* ===== DATA ===== */
    data.forEach((jurnal) => {
      jurnal.jurnal_detail.forEach((d) => {
        const row: JurnalExcelRow = {
          tanggal: jurnal.tanggal,
          no_bukti: jurnal.no_bukti,
          sumber: jurnal.sumber,
          keterangan: jurnal.keterangan,
          debit: Number(d.debit),
          kredit: Number(d.kredit),
        };

        sheet.addRow([
          row.tanggal,
          row.no_bukti,
          row.sumber,
          row.keterangan,
          row.debit,
          row.kredit,
        ]);
      });
    });

    /* ===== QR CODE ===== */
    const qrText: string = "Jurnal Akuntansi - Haemes Mandiri Sejahterabanta";

    const qrBase64: string = await QRCode.toDataURL(qrText, {
      width: 300,
      margin: 1,
    });

    const imageId = workbook.addImage({
      base64: qrBase64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 7, row: 1 },
      ext: { width: 150, height: 150 },
    });

    /* ===== RESPONSE ===== */
    const buffer: Buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="jurnal-akuntansi.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT JURNAL ERROR:", error);
    return NextResponse.json(
      { message: "Gagal export jurnal" },
      { status: 500 },
    );
  }
}
