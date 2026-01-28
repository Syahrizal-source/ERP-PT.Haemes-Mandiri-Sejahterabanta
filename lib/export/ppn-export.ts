import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PPNExportRow = {
  id: number;
  jenis_ppn: string;
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
    { header: "Nilai Dasar", key: "nilai_dasar", width: 18 },
    { header: "Tarif %", key: "tarif_ppn", width: 10 },
    { header: "Nilai PPN", key: "nilai_ppn", width: 18 },
    { header: "Tanggal", key: "tanggal_transaksi", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PPN-${r.id}`);
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const imageId = workbook.addImage({ base64, extension: "png" });

    sheet.addImage(imageId, {
      tl: { col: 6, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
