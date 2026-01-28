import ExcelJS from "exceljs";
import QRCode from "qrcode";

export async function buildNeracaExcelWithQR(
  aset: number,
  ekuitas: number,
  liabilitas = 0,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Neraca Armada");

  // Header
  sheet.addRow(["Keterangan", "Nilai"]);
  sheet.addRow(["ASET", aset]);
  sheet.addRow(["LIABILITAS", liabilitas]);
  sheet.addRow(["EKUITAS", ekuitas]);

  sheet.getRow(1).font = { bold: true };

  // QR Payload (audit friendly)
  const qrPayload = JSON.stringify({
    report: "Neraca Armada",
    aset,
    liabilitas,
    ekuitas,
    generated_at: new Date().toISOString(),
  });

  const qr = await QRCode.toDataURL(qrPayload);
  const base64 = qr.replace(/^data:image\/png;base64,/, "");

  const img = workbook.addImage({ base64, extension: "png" });

  sheet.addImage(img, {
    tl: { col: 3, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
