import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface CostControlKebunRow {
  id_periode: number;
  region_id: string;
  region_name: string;
  total_cost: number;
}

export async function exportCostControlKebunExcel(
  data: CostControlKebunRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Cost Control Kebun");

  worksheet.columns = [
    { header: "Region", key: "region_name", width: 25 },
    { header: "Total Cost (Rp)", key: "total_cost", width: 25 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  data.forEach((row) => {
    worksheet.addRow({
      region_name: row.region_name,
      total_cost: Number(row.total_cost ?? 0),
    });
  });

  worksheet.getColumn("total_cost").numFmt = '"Rp"#,##0.00';

  worksheet.autoFilter = {
    from: "A1",
    to: `B${worksheet.rowCount}`,
  };

  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Cost Control Kebun", periode),
  );

  return workbook;
}
