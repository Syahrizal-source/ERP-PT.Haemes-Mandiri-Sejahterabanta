import ExcelJS from "exceljs";
import QRCode from "qrcode";

type HutangExportRow = {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status: string;
};

export async function buildHutangExcelWithQR(
  rows: HutangExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hutang");

  sheet.columns = [
    { header: "ID", key: "id_hutang", width: 10 },
    { header: "Supplier", key: "supplier", width: 25 },
    { header: "No Invoice", key: "no_invoice", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "Jatuh Tempo", key: "jatuh_tempo", width: 15 },
    { header: "Nilai", key: "nilai", width: 18 },
    { header: "Status", key: "status", width: 28 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`HUTANG-${r.no_invoice}`);
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    const imageId = workbook.addImage({ base64, extension: "png" });

    sheet.addImage(imageId, {
      tl: { col: 7, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
