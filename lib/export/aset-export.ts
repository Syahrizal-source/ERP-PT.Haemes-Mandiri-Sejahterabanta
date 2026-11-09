import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { calcDepresiasi } from "@/lib/aset/calc-depresiasi";

type AsetExportRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
};

export async function buildAsetExcelWithQR(
  rows: AsetExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Aset");

  sheet.columns = [
    { header: "ID", key: "id_aset", width: 10 },
    { header: "Nama Aset", key: "nama", width: 25 },
    { header: "Nilai Perolehan", key: "nilai_perolehan", width: 18 },
    { header: "Tanggal Perolehan", key: "tanggal_perolehan", width: 18 },
    { header: "Umur Manfaat (Tahun)", key: "umur_manfaat", width: 22 },
    { header: "Depresiasi / Bulan", key: "depresiasi_bulanan", width: 22 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    const depresiasiBulanan = calcDepresiasi(
      r.nilai_perolehan,
      r.umur_manfaat,
    ).depresiasiBulanan;

    sheet.addRow({
      ...r,
      depresiasi_bulanan: depresiasiBulanan,
    });

    const qrDataUrl = await QRCode.toDataURL(`ASET-${r.id_aset}`, {
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
