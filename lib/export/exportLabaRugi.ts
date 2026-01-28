import ExcelJS from "exceljs";
import { LabaRugiRow } from "@/types/laporan";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export async function exportLabaRugiExcel(
  data: LabaRugiRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laba Rugi");

  ws.columns = [
    { header: "Kode", key: "kode", width: 15 },
    { header: "Nama", key: "nama", width: 30 },
    { header: "Nilai", key: "nilai", width: 20 },
  ];

  data.forEach((r) => ws.addRow(r));
  await attachQRCode(wb, ws, buildQRMeta("Laba Rugi", periode));
  return wb;
}
