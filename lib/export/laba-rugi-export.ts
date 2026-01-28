import ExcelJS from "exceljs";
import QRCode from "qrcode";

export async function buildLabaRugiExcelWithQR(
  pendapatan: number,
  beban: number,
): Promise<Buffer> {
  const labaBersih = pendapatan - beban;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Laba Rugi Armada");

  // Header
  sheet.addRow(["Keterangan", "Nilai"]);
  sheet.addRow(["Pendapatan", pendapatan]);
  sheet.addRow(["Beban", beban]);
  sheet.addRow(["Laba Bersih", labaBersih]);

  sheet.getRow(1).font = { bold: true };

  // QR payload audit-friendly
  const qrPayload = JSON.stringify({
    report: "Laba Rugi Armada",
    pendapatan,
    beban,
    laba_bersih: labaBersih,
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
