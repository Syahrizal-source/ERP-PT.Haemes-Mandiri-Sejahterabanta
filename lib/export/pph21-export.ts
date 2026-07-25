import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type PPH21ExportRow = {
  id: number;
  nama: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  nilai_pph21: number;
  tanggal: string;
};

export async function buildPPH21ExcelWithQR(
  rows: PPH21ExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PPH21");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Nama", key: "nama", width: 25 },
    { header: "Gaji Bruto", key: "gaji_bruto", width: 20 },
    { header: "Biaya Jabatan", key: "biaya_jabatan", width: 20 },
    { header: "Iuran", key: "iuran", width: 15 },
    { header: "Tarif (%)", key: "tarif_pph21", width: 15 },
    { header: "Nilai PPh21", key: "nilai_pph21", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 15 },
  ];

  rows.forEach((row) => {
    sheet.addRow(row);
  });

  const metadata = {
    modul: "PPH21",
    total: rows.length,
    generated_at: new Date().toISOString(),
    data: rows,
  };

  const hash: string = generateReportHash(metadata);
  const qrBuffer: Buffer = await QRCode.toBuffer(hash);

  const imageId = workbook.addImage({
    buffer: qrBuffer,
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 9, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const footerRow = rows.length + 3;

  sheet.getCell(`A${footerRow}`).value = "Generated At";
  sheet.getCell(`B${footerRow}`).value = metadata.generated_at;

  sheet.getCell(`A${footerRow + 1}`).value = "Report Hash";
  sheet.getCell(`B${footerRow + 1}`).value = hash;

  sheet.getCell(`A${footerRow + 2}`).value = "Internal Signature";
  sheet.getCell(`B${footerRow + 2}`).value = "SYSTEM-AUTO-GENERATED";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}