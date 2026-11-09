import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type TrialBalanceExportRow = {
  kode: string;
  nama: string;
  tipe: string;
  total_debit: number;
  total_kredit: number;
  saldo: number;
};

export async function buildTrialBalanceExcelWithQR(
  periode: number,
  rows: TrialBalanceExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Trial Balance");

  sheet.columns = [
    { header: "Kode", key: "kode", width: 15 },
    { header: "Nama Akun", key: "nama", width: 30 },
    { header: "Tipe", key: "tipe", width: 15 },
    { header: "Total Debit", key: "total_debit", width: 20 },
    { header: "Total Kredit", key: "total_kredit", width: 20 },
    { header: "Saldo", key: "saldo", width: 20 },
  ];

  rows.forEach((row) => sheet.addRow(row));

  const totalDebit = rows.reduce((s, r) => s + r.total_debit, 0);
  const totalKredit = rows.reduce((s, r) => s + r.total_kredit, 0);

  const metadata = {
    modul: "TRIAL_BALANCE",
    periode,
    total_debit: totalDebit,
    total_kredit: totalKredit,
    generated_at: new Date().toISOString(),
    data: rows,
  };

  const hash = generateReportHash(metadata);
  const qrBuffer = await QRCode.toDataURL(hash);

  const imageId = workbook.addImage({
    base64: qrBuffer.replace(/^data:image\/png;base64,/, ""),
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 7, row: 1 },
    ext: { width: 140, height: 140 },
  });

  const footerRow = rows.length + 3;

  sheet.getCell(`A${footerRow}`).value = "Generated At";
  sheet.getCell(`B${footerRow}`).value = metadata.generated_at;

  sheet.getCell(`A${footerRow + 1}`).value = "Report Hash";
  sheet.getCell(`B${footerRow + 1}`).value = hash;

  sheet.getCell(`A${footerRow + 2}`).value = "Balance Status";
  sheet.getCell(`B${footerRow + 2}`).value =
    totalDebit === totalKredit ? "BALANCED" : "NOT BALANCED";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
