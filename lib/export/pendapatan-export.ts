import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PendapatanExportRow = {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  keterangan: string;
};

export async function buildPendapatanExcelWithQR(
  rows: PendapatanExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pendapatan");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "COA", key: "id_coa", width: 15 },
    { header: "Nominal", key: "nominal", width: 18 },
    { header: "Keterangan", key: "keterangan", width: 25 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PENDAPATAN-${r.id}`, {
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
      tl: { col: 5, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
