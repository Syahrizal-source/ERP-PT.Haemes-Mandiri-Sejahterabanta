import ExcelJS from "exceljs";
import { CostControlRow } from "@/types/laporan";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export async function exportCostControlExcel(
  data: CostControlRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cost Control");

  ws.columns = [
    { header: "Item", key: "item", width: 30 },
    { header: "RAB", key: "rab", width: 20 },
    { header: "Realisasi", key: "realisasi", width: 20 },
    { header: "Selisih", key: "selisih", width: 20 },
    { header: "Status", key: "status", width: 15 },
  ];

  data.forEach((r) => ws.addRow(r));
  await attachQRCode(wb, ws, buildQRMeta("Cost Control", periode));
  return wb;
}
