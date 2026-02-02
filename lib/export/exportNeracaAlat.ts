import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface NeracaAlatRow {
  id_alat: string;
  asset_number: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
}

export async function exportNeracaAlatExcel(
  data: NeracaAlatRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Neraca Alat");

  worksheet.columns = [
    { header: "Asset Number", key: "asset_number", width: 25 },
    { header: "Kategori", key: "tipe", width: 20 },
    { header: "Saldo (Rp)", key: "saldo", width: 25 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  data.forEach((row) => {
    worksheet.addRow({
      asset_number: row.asset_number,
      tipe: row.tipe,
      saldo: Number(row.saldo),
    });
  });

  worksheet.getColumn("saldo").numFmt = '"Rp"#,##0.00';

  worksheet.autoFilter = {
    from: "A1",
    to: `C${worksheet.rowCount}`,
  };

  await attachQRCode(
    workbook,
    worksheet,
    buildQRMeta("Neraca Alat Berat", periode),
  );

  return workbook;
}
