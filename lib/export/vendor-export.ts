import ExcelJS from "exceljs";
import QRCode from "qrcode";

type VendorExportRow = {
  id_vendor: number;
  nama: string;
  npwp?: string;
  alamat?: string;
};

export async function buildVendorExcelWithQR(
  rows: VendorExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Vendor");

  sheet.columns = [
    { header: "ID", key: "id_vendor", width: 10 },
    { header: "Nama", key: "nama", width: 25 },
    { header: "NPWP", key: "npwp", width: 20 },
    { header: "Alamat", key: "alamat", width: 30 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowIndex = i + 2;

    sheet.addRow(r);

    const qrDataUrl = await QRCode.toDataURL(`VENDOR-${r.id_vendor}`);
    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const imageId = workbook.addImage({ base64, extension: "png" });

    sheet.addImage(imageId, {
      tl: { col: 4, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
