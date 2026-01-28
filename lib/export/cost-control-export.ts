import ExcelJS from "exceljs";
import QRCode from "qrcode";

export type CostControlRow = {
  tanggal: string;
  jenis_biaya: string;
  nominal: number;
};

export async function buildCostControlExcelWithQR(
  data: CostControlRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cost Control Armada");

  // Header
  sheet.addRow(["Tanggal", "Jenis Biaya", "Nominal"]);
  sheet.getRow(1).font = { bold: true };

  let total = 0;

  data.forEach((row) => {
    sheet.addRow([row.tanggal, row.jenis_biaya, row.nominal]);
    total += row.nominal;
  });

  // Baris total
  sheet.addRow([]);
  sheet.addRow(["", "TOTAL", total]);
  sheet.getRow(sheet.rowCount).font = { bold: true };

  // QR Payload audit-friendly
  const qrPayload = JSON.stringify({
    report: "Cost Control Armada",
    total,
    jumlah_transaksi: data.length,
    generated_at: new Date().toISOString(),
  });

  const qr = await QRCode.toDataURL(qrPayload);
  const base64 = qr.replace(/^data:image\/png;base64,/, "");
  const img = workbook.addImage({ base64, extension: "png" });

  sheet.addImage(img, {
    tl: { col: 4, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
