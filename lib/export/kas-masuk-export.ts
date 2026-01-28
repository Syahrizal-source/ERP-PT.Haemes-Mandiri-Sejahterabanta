import ExcelJS from "exceljs";
import QRCode from "qrcode";

type KasMasukExportRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  keterangan: string;
};

export async function buildKasMasukExcelWithQR(
  rows: KasMasukExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Kas Masuk");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "No Bukti", key: "no_bukti", width: 18 },
    { header: "Sumber", key: "sumber", width: 20 },
    { header: "Akun Kas", key: "id_akun_kas", width: 15 },
    { header: "Akun Lawan", key: "id_akun_lawan", width: 15 },
    { header: "Nominal", key: "nominal", width: 18 },
    { header: "Keterangan", key: "keterangan", width: 25 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`KASMASUK-${r.no_bukti}`, {
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
      tl: { col: 8, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
