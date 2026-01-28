// lib/report/exportExcel.ts
import ExcelJS from "exceljs";
import QRCode from "qrcode";

export type SheetConfig<T extends Record<string, unknown>> = {
  name: string;
  headers: string[];
  rows: (keyof T)[];
  data: T[] | null | undefined; // ⬅️ AMAN
};

export async function exportExcelWithQR(
  title: string,
  sheets: SheetConfig<Record<string, unknown>>[],
  qrMeta: Record<string, unknown>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Kebun";
  workbook.created = new Date();

  const qrText = JSON.stringify(qrMeta);
  await QRCode.toDataURL(qrText); // cukup generate, tidak wajib ditaruh

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);

    ws.mergeCells("A1", "E1");
    ws.getCell("A1").value = title;
    ws.getCell("A1").font = { bold: true, size: 14 };

    ws.addRow([]);
    ws.addRow(sheet.headers);
    ws.getRow(3).font = { bold: true };

    const safeData: Record<string, unknown>[] = Array.isArray(sheet.data)
      ? sheet.data
      : [];

    for (const row of safeData) {
      ws.addRow(sheet.rows.map((k) => row[k] ?? ""));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
