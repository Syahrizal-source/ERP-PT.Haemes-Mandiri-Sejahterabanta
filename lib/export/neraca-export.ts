import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateReportHash } from "@/lib/security/hash";

export type NeracaExportRow = {
  kode: string;
  nama: string;
  tipe: string;
  saldo: number;
};

export async function buildNeracaExcelWithQR(
  periode: number,
  rows: NeracaExportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("NERACA");

  sheet.columns = [
    { header: "Kode", key: "kode", width: 15 },
    { header: "Nama Akun", key: "nama", width: 30 },
    { header: "Tipe", key: "tipe", width: 15 },
    { header: "Saldo", key: "saldo", width: 20 },
  ];

  rows.forEach((row) => sheet.addRow(row));

  const totalAset = rows
    .filter((r) => r.tipe === "ASET")
    .reduce((s, r) => s + r.saldo, 0);

  const totalLiabilitas = rows
    .filter((r) => r.tipe === "LIABILITAS")
    .reduce((s, r) => s + r.saldo, 0);

  const totalEkuitas = rows
    .filter((r) => r.tipe === "EKUITAS")
    .reduce((s, r) => s + r.saldo, 0);

  const metadata = {
    modul: "NERACA",
    periode,
    total_aset: totalAset,
    total_liabilitas: totalLiabilitas,
    total_ekuitas: totalEkuitas,
    generated_at: new Date().toISOString(),
    data: rows,
  };

  const hash = generateReportHash(metadata);
  const qrBuffer = await QRCode.toBuffer(hash);

  const imageId = workbook.addImage({
    buffer: qrBuffer,
    extension: "png",
  });

  sheet.addImage(imageId, {
    tl: { col: 6, row: 1 },
    ext: { width: 140, height: 140 },
  });

  const footerRow = rows.length + 3;

  sheet.getCell(`A${footerRow}`).value = "Generated At";
  sheet.getCell(`B${footerRow}`).value = metadata.generated_at;

  sheet.getCell(`A${footerRow + 1}`).value = "Report Hash";
  sheet.getCell(`B${footerRow + 1}`).value = hash;

  sheet.getCell(`A${footerRow + 2}`).value = "Balance Status";
  sheet.getCell(`B${footerRow + 2}`).value =
    totalAset === totalLiabilitas + totalEkuitas ? "BALANCED" : "NOT BALANCED";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
