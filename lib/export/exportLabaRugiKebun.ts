import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";
import { LabaRugiKebunRow } from "@/types/kebun";

export async function exportLabaRugiKebunExcel(
  data: LabaRugiKebunRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laba Rugi Kebun");

  worksheet.columns = [
    { header: "Region", key: "region_name", width: 25 },
    { header: "Total Pendapatan (Rp)", key: "total_pendapatan", width: 25 },
    { header: "Total Beban (Rp)", key: "total_beban", width: 25 },
    { header: "Laba Bersih (Rp)", key: "laba_bersih", width: 25 },
  ];

  worksheet.getRow(1).font = { bold: true };

  data.forEach((row) => {
    worksheet.addRow({
      region_name: row.region_name,
      total_pendapatan: Number(row.total_pendapatan ?? 0),
      total_beban: Number(row.total_beban ?? 0),
      laba_bersih: Number(row.laba_bersih ?? 0),
    });
  });

  worksheet.getColumn("total_pendapatan").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("total_beban").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("laba_bersih").numFmt = '"Rp"#,##0.00';

  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Laba Rugi Kebun", periode),
  );

  return workbook;
}
