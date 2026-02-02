import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface CashFlowAlatRow {
  id_alat: string;
  asset_number: string;
  tanggal: string;
  no_bukti: string;
  kas_masuk: number;
  kas_keluar: number;
  net_cash: number;
  running_balance: number;
}

export async function exportCashFlowAlatExcel(
  data: CashFlowAlatRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cash Flow Alat");

  worksheet.columns = [
    { header: "Asset Number", key: "asset_number", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "No Bukti", key: "no_bukti", width: 25 },
    { header: "Kas Masuk (Rp)", key: "kas_masuk", width: 20 },
    { header: "Kas Keluar (Rp)", key: "kas_keluar", width: 20 },
    { header: "Net Cash (Rp)", key: "net_cash", width: 20 },
    { header: "Running Balance (Rp)", key: "running_balance", width: 25 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  data.forEach((row) => {
    worksheet.addRow({
      asset_number: row.asset_number,
      tanggal: row.tanggal,
      no_bukti: row.no_bukti,
      kas_masuk: Number(row.kas_masuk),
      kas_keluar: Number(row.kas_keluar),
      net_cash: Number(row.net_cash),
      running_balance: Number(row.running_balance),
    });
  });

  worksheet.getColumn("kas_masuk").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("kas_keluar").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("net_cash").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("running_balance").numFmt = '"Rp"#,##0.00';

  worksheet.autoFilter = {
    from: "A1",
    to: `G${worksheet.rowCount}`,
  };

  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Cash Flow Alat Berat", periode),
  );

  return workbook;
}
