import QRCode from "qrcode";
import ExcelJS from "exceljs";
import { QRMeta } from "@/types/laporan";

export function buildQRMeta(laporan: string, periode: number): QRMeta {
  return {
    laporan,
    periode,
    generated_at: new Date().toISOString(),
    checksum: `${laporan}-${periode}`,
  };
}

export async function attachQRCode(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  meta: QRMeta,
): Promise<void> {
  const qr = await QRCode.toDataURL(JSON.stringify(meta));
  const img = workbook.addImage({ base64: qr, extension: "png" });

  sheet.addImage(img, {
    tl: { col: 6, row: 1 },
    ext: { width: 120, height: 120 },
  });
}
