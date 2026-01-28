import ExcelJS from "exceljs";
import QRCode from "qrcode";

type InvoiceExportRow = {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status: string;
};

export async function buildInvoiceExcelWithQR(
  rows: InvoiceExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoice");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "No Invoice", key: "no_invoice", width: 20 },
    { header: "Customer", key: "customer", width: 25 },
    { header: "Nominal", key: "nominal", width: 18 },
    { header: "Status", key: "status", width: 28 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`INVOICE-${r.no_invoice}`, {
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
