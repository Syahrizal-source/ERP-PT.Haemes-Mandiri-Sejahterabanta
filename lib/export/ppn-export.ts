import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type PPNExportRow = {
  id: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
};

export async function buildPPNExcelWithQR(
  rows: PPNExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PPN");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Jenis", key: "jenis_ppn", width: 15 },
    { header: "Nilai Dasar", key: "nilai_dasar", width: 20 },
    { header: "Tarif (%)", key: "tarif_ppn", width: 15 },
    { header: "Nilai PPN", key: "nilai_ppn", width: 20 },
    { header: "Tanggal", key: "tanggal_transaksi", width: 15 },
  ];

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  const metadata = {
    module: "PPN",
    total_rows: rows.length,
    generated_at: new Date().toISOString(),
    data: rows,
  };

  const hash = generateReportHash(metadata);
  const qrImage = await QRCode.toDataURL(hash);

  const imageId = workbook.addImage({
    base64: qrImage.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 7, row: 1 },
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
