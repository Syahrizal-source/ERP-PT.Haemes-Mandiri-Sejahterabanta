import ExcelJS from "exceljs";
import { attachQRCode, buildQRMeta } from "@/lib/export/exportHelper";

export interface NeracaKebunRow {
  id_periode: number;
  region_id: string;
  region_name: string;
  tipe: "ASET" | "LIABILITAS" | "EKUITAS";
  saldo: number;
}

export async function exportNeracaKebunExcel(
  data: NeracaKebunRow[],
  periode: number,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Neraca Kebun");

  worksheet.columns = [
    { header: "Region", key: "region_name", width: 25 },
    { header: "Kategori", key: "tipe", width: 20 },
    { header: "Saldo (Rp)", key: "saldo", width: 25 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  data.forEach((row) => {
    worksheet.addRow({
      region_name: row.region_name,
      tipe: row.tipe,
      saldo: Number(row.saldo ?? 0),
    });
  });

  worksheet.getColumn("saldo").numFmt = '"Rp"#,##0.00';

  worksheet.autoFilter = {
    from: "A1",
    to: `C${worksheet.rowCount}`,
  };

  await attachQRCode(workbook, worksheet, buildQRMeta("Neraca Kebun", periode));

  return workbook;
}
