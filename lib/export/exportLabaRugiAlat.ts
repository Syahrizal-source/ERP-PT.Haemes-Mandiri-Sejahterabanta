import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface LabaRugiAlatRow {
  id_alat: string;
  asset_number: string;
  total_pendapatan: number;
  total_beban: number;
  laba_bersih: number;
}

export async function exportLabaRugiAlatExcel(
  data: LabaRugiAlatRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laba Rugi Alat");

  // Define columns
  worksheet.columns = [
    { header: "Asset Number", key: "asset_number", width: 25 },
    { header: "Total Pendapatan (Rp)", key: "total_pendapatan", width: 25 },
    { header: "Total Beban (Rp)", key: "total_beban", width: 25 },
    { header: "Laba Bersih (Rp)", key: "laba_bersih", width: 25 },
  ];

  // Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Insert rows
  data.forEach((row) => {
    worksheet.addRow({
      asset_number: row.asset_number,
      total_pendapatan: Number(row.total_pendapatan),
      total_beban: Number(row.total_beban),
      laba_bersih: Number(row.laba_bersih),
    });
  });

  // Format currency
  worksheet.getColumn("total_pendapatan").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("total_beban").numFmt = '"Rp"#,##0.00';
  worksheet.getColumn("laba_bersih").numFmt = '"Rp"#,##0.00';

  // Auto filter
  worksheet.autoFilter = {
    from: "A1",
    to: `D${worksheet.rowCount}`,
  };

  // Add QR Code
  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Laba Rugi Alat Berat", periode),
  );

  return workbook;
}
