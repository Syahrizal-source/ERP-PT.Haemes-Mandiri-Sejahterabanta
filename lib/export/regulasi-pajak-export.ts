import ExcelJS from "exceljs";
import QRCode from "qrcode";

export async function buildRegulasiPajakExcelWithQR(
  rows: {
    kode_pajak: string;
    tarif: number;
    tahun: number;
    versi: number;
  }[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Regulasi Pajak");

  ws.addRow(["Kode", "Tarif", "Tahun", "Versi"]);

  rows.forEach((r) => {
    ws.addRow([r.kode_pajak, r.tarif, r.tahun, r.versi]);
  });

  const qr = await QRCode.toDataURL("REGULASI-PAJAK-EXPORT");
  const img = wb.addImage({
    base64: qr.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });

  ws.addImage(img, {
    tl: { col: 5, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
