import ExcelJS from "exceljs";
import QRCode from "qrcode";
import type { KasbonRow } from "@/types/kasbon";

export async function buildKasbonExcelWithQR(
  rows: KasbonRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Kasbon");

  sheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "Deskripsi", key: "deskripsi", width: 30 },
    { header: "No Voucher", key: "no_voucher", width: 20 },
    { header: "Debit", key: "debit", width: 15 },
    { header: "Kredit", key: "kredit", width: 15 },
    { header: "Saldo", key: "saldo", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const rowIndex = i + 2;

    sheet.addRow({
      tanggal: r.tanggal,
      deskripsi: r.deskripsi,
      no_voucher: r.no_voucher,
      debit: r.debit,
      kredit: r.kredit,
      saldo: r.saldo ?? "",
    });

    // 🔳 Generate QR
    const qrDataUrl = await QRCode.toDataURL(r.no_voucher, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 150,
    });

    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const imageId = workbook.addImage({
      base64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 6, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
