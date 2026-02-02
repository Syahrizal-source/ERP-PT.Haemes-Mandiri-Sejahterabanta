import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

/**
 * Struktur data dari view v_cost_control_alat
 */
export interface CostControlAlatRow {
  id_alat: string;
  asset_number: string;
  total_cost: number;
}

/**
 * Generate Excel Cost Control Alat Berat
 */
export async function exportCostControlAlatExcel(
  data: CostControlAlatRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cost Control Alat");

  // Header Columns
  worksheet.columns = [
    { header: "Asset Number", key: "asset_number", width: 25 },
    { header: "Total Cost (Rp)", key: "total_cost", width: 25 },
  ];

  // Styling Header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Insert Data
  data.forEach((row) => {
    worksheet.addRow({
      asset_number: row.asset_number,
      total_cost: Number(row.total_cost),
    });
  });

  // Format Currency Rupiah
  worksheet.getColumn("total_cost").numFmt = '"Rp"#,##0.00';

  // Auto filter
  worksheet.autoFilter = {
    from: "A1",
    to: `B${worksheet.rowCount}`,
  };

  // Tambahkan QR Code (Validasi Report)
  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Cost Control Alat Berat", periode),
  );

  return workbook;
}
