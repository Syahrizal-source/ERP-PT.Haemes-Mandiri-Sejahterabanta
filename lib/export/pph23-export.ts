import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type PPH23ExportRow = {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
};

export async function buildPPH23ExcelWithQR(
  rows: PPH23ExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PPH23");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Vendor", key: "id_vendor", width: 15 },
    { header: "Jenis Jasa", key: "jenis_jasa", width: 30 },
    { header: "Nilai Transaksi", key: "nilai_transaksi", width: 20 },
    { header: "Tarif (%)", key: "tarif_pph23", width: 15 },
    { header: "PPh23", key: "pph23_terutang", width: 20 },
    { header: "Tanggal", key: "tanggal_transaksi", width: 15 },
  ];

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  const metadata = {
    module: "PPH23",
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
    tl: { col: 8, row: 1 },
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
