import ExcelJS from "exceljs";
import QRCode from "qrcode";

type PayrollExportRow = {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
  net_gaji: number;
};

export async function buildPayrollExcelWithQR(
  rows: PayrollExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payroll");

  sheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Bulan", key: "bulan", width: 10 },
    { header: "Tahun", key: "tahun", width: 10 },
    { header: "Total Gaji", key: "total_gaji", width: 18 },
    { header: "Total Tunjangan", key: "total_tunjangan", width: 20 },
    { header: "Total Potongan", key: "total_potongan", width: 20 },
    { header: "Net Gaji", key: "net_gaji", width: 18 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`PAYROLL-${r.bulan}-${r.tahun}`, {
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
      tl: { col: 7, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
