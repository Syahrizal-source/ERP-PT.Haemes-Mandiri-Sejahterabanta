import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PPH21ExportRow = {
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
    { header: "Gaji Bruto", key: "gaji_bruto", width: 18 },
    { header: "Biaya Jabatan", key: "biaya_jabatan", width: 18 },
    { header: "Iuran", key: "iuran", width: 18 },
    { header: "Tarif %", key: "tarif_pph21", width: 12 },
    { header: "Nilai PPh21", key: "nilai_pph21", width: 18 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PPH21-${r.id}`);
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    const imageId = workbook.addImage({ base64, extension: "png" });

    sheet.addImage(imageId, {
      tl: { col: 8, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
