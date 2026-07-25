import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type RegulasiExportRow = {
  kode_pajak: string;
  tarif: number;
  tahun: number;
  versi: number;
};

export async function buildRegulasiPajakExcelWithQR(
  rows: RegulasiExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Regulasi Pajak");

  sheet.columns = [
    { header: "Kode Pajak", key: "kode_pajak", width: 20 },
    { header: "Tarif (%)", key: "tarif", width: 15 },
    { header: "Tahun", key: "tahun", width: 10 },
    { header: "Versi", key: "versi", width: 10 },
  ];

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  const metadata = {
    module: "REGULASI_PAJAK",
    total_rows: rows.length,
    generated_at: new Date().toISOString(),
    data: rows,
  };

  const hash = generateReportHash(metadata);
  const qrImage = await QRCode.toBuffer(hash);

  const imageId = workbook.addImage({
    buffer: qrImage,
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 6, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const footerRowIndex = rows.length + 3;

  sheet.getCell(`A${footerRowIndex}`).value = "Generated At:";
  sheet.getCell(`B${footerRowIndex}`).value = metadata.generated_at;

  sheet.getCell(`A${footerRowIndex + 1}`).value = "Report Hash:";
  sheet.getCell(`B${footerRowIndex + 1}`).value = hash;

  sheet.getCell(`A${footerRowIndex + 2}`).value = "Internal Signature:";
  sheet.getCell(`B${footerRowIndex + 2}`).value = "SYSTEM-AUTO-GENERATED";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
