import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface CashFlowKebunRow {
  id_periode: number;
  region_id: string;
  region_name: string;
  tanggal: string;
  no_bukti: string;
  kas_masuk: number;
  kas_keluar: number;
  net_cash: number;
}

export async function exportCashFlowKebunExcel(
  data: CashFlowKebunRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cash Flow Kebun");

  worksheet.columns = [
    { header: "Region", key: "region_name", width: 20 },
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

  let runningBalance = 0;

  data.forEach((row) => {
    const net = Number(row.net_cash ?? 0);
    runningBalance += net;

    worksheet.addRow({
      region_name: row.region_name,
      tanggal: row.tanggal,
      no_bukti: row.no_bukti,
      kas_masuk: Number(row.kas_masuk ?? 0),
      kas_keluar: Number(row.kas_keluar ?? 0),
      net_cash: net,
      running_balance: runningBalance,
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
    buildQRMeta("Cash Flow Kebun", periode),
  );

  return workbook;
}
