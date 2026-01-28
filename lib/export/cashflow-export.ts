import ExcelJS from "exceljs";
import QRCode from "qrcode";

export async function buildCashFlowExcelWithQR(
  cashIn: number,
  cashOut: number,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cash Flow");

  sheet.addRow(["Cash In", cashIn]);
  sheet.addRow(["Cash Out", cashOut]);
  sheet.addRow(["Net Cash", cashIn - cashOut]);

  const qr = await QRCode.toDataURL(`CASHFLOW-${cashIn}-${cashOut}`);
  const base64 = qr.replace(/^data:image\/png;base64,/, "");
  const img = workbook.addImage({ base64, extension: "png" });

  sheet.addImage(img, {
    tl: { col: 3, row: 1 },
    ext: { width: 150, height: 150 },
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
