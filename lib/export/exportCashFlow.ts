import ExcelJS from "exceljs";
import { CashFlowRow } from "@/types/laporan";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export async function exportCashFlowExcel(
  data: CashFlowRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cash Flow");

  ws.columns = [
    { header: "Masuk", key: "masuk", width: 20 },
    { header: "Keluar", key: "keluar", width: 20 },
    { header: "Saldo", key: "saldo", width: 20 },
  ];

  data.forEach((r) => ws.addRow(r));
  await attachQRCode(wb, ws, buildQRMeta("Cash Flow", periode));
  return wb;
}
