import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PPH4ExportRow = {
  id: number;
  jenis_objek: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
  tanggal_transaksi: string;
};

export async function buildPPH4ExcelWithQR(
  rows: PPH4ExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PPH4");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Objek", key: "jenis_objek", width: 20 },
    { header: "Nilai Transaksi", key: "nilai_transaksi", width: 18 },
    { header: "Tarif %", key: "tarif_pph4", width: 10 },
    { header: "PPH4 Terutang", key: "pph4_terutang", width: 18 },
    { header: "Tanggal", key: "tanggal_transaksi", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PPH4-${r.id}`);
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
