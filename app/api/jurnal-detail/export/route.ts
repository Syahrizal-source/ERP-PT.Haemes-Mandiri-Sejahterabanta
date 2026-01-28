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
   TYPES SUPABASE
   BIGINT = string, NUMERIC = string/number
================================ */
interface JurnalDetailRow {
  id_detail: string; // BIGINT supabase
  id_jurnal: string;
  id_coa: string;
  debit: number;
  kredit: number;
  id_alat: string | null;
  id_cost_center: string | null;
}

interface CoaRow {
  id_coa: string;
  kode: string;
  nama: string;
}

/* ===============================
   EXPORT JURNAL DETAIL EXCEL + QR CODE
================================ */
export async function GET() {
  try {
    // ✅ Ambil data jurnal_detail
    const { data: details, error: detailsError } = await supabase
      .from<JurnalDetailRow>("jurnal_detail")
      .select("*")
      .order("id_jurnal", { ascending: true });

    if (detailsError || !details) throw detailsError;

    // ✅ Ambil COA
    const { data: coas, error: coasError } = await supabase
      .from<CoaRow>("coa")
      .select("id_coa,kode,nama");

    if (coasError || !coas) throw coasError;

    // ✅ Buat workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Jurnal Detail");

    // ✅ Header
    sheet.addRow([
      "ID Detail",
      "ID Jurnal",
      "COA Kode",
      "COA Nama",
      "Debit",
      "Kredit",
      "ID Alat",
      "ID Cost Center",
    ]);
    sheet.getRow(1).font = { bold: true };

    // ✅ Tambahkan row
    details.forEach((d) => {
      const coa = coas.find((c) => c.id_coa === d.id_coa);
      sheet.addRow([
        d.id_detail,
        d.id_jurnal,
        coa?.kode ?? "",
        coa?.nama ?? "",
        d.debit,
        d.kredit,
        d.id_alat ?? "",
        d.id_cost_center ?? "",
      ]);
    });

    // ✅ Format angka ribuan/miliar
    sheet.getColumn(5).numFmt = "#,##0.00";
    sheet.getColumn(6).numFmt = "#,##0.00";

    // ✅ QR CODE
    const qrText = "Jurnal Detail - Haemes Mandiri Sejahterabanta";
    const qrBase64 = await QRCode.toDataURL(qrText, { width: 200, margin: 1 });
    const imageId = workbook.addImage({ base64: qrBase64, extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: 8, row: 0 },
      ext: { width: 120, height: 120 },
    });

    // ✅ Export buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="jurnal_detail.xlsx"',
      },
    });
  } catch (err) {
    console.error("EXPORT JURNAL DETAIL ERROR:", err);
    return NextResponse.json(
      { message: "Gagal export jurnal detail" },
      { status: 500 },
    );
  }
}
