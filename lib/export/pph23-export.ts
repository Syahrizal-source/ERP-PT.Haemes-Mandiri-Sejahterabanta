import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PPH23ExportRow = {
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
    { header: "Vendor ID", key: "id_vendor", width: 12 },
    { header: "Jenis Jasa", key: "jenis_jasa", width: 25 },
    { header: "Nilai Transaksi", key: "nilai_transaksi", width: 18 },
    { header: "Tarif %", key: "tarif_pph23", width: 10 },
    { header: "PPh23 Terutang", key: "pph23_terutang", width: 18 },
    { header: "Tanggal", key: "tanggal_transaksi", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PPH23-${r.id}`);
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
