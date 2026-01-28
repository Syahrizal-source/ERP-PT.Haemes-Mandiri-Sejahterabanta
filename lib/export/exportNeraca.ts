import ExcelJS from "exceljs";
import { NeracaRow } from "@/types/laporan";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export async function exportNeracaExcel(
  data: NeracaRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Neraca");

  ws.columns = [
    { header: "Kode", key: "kode", width: 15 },
    { header: "Nama", key: "nama", width: 30 },
    { header: "Saldo", key: "saldo", width: 20 },
  ];

  data.forEach((r) => ws.addRow(r));
  await attachQRCode(wb, ws, buildQRMeta("Neraca", periode));
  return wb;
}
