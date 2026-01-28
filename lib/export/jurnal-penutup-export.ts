import ExcelJS from "exceljs";
import QRCode from "qrcode";

type JurnalPenutupHeader = {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  id_periode: number;
};

type JurnalPenutupDetail = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export async function buildJurnalPenutupExcelWithQR(
  header: JurnalPenutupHeader,
  details: JurnalPenutupDetail[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Jurnal Penutup");

  sheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 15 },
    { header: "No Bukti", key: "no_bukti", width: 20 },
    { header: "Keterangan", key: "keterangan", width: 30 },
    { header: "Periode", key: "id_periode", width: 12 },
    { header: "COA", key: "id_coa", width: 12 },
    { header: "Debit", key: "debit", width: 15 },
    { header: "Kredit", key: "kredit", width: 15 },
    { header: "QR", key: "qr", width: 20 },
  ];

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    const rowIndex = i + 2;

    sheet.addRow({
      tanggal: header.tanggal,
      no_bukti: header.no_bukti,
      keterangan: header.keterangan,
      id_periode: header.id_periode,
      id_coa: d.id_coa,
      debit: d.debit,
      kredit: d.kredit,
    });

    const qrDataUrl = await QRCode.toDataURL(header.no_bukti, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 150,
    });

    const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");

    const imageId = workbook.addImage({
      base64,
      extension: "png",
    });

    sheet.addImage(imageId, {
      tl: { col: 7, row: rowIndex - 1 },
      ext: { width: 120, height: 120 },
    });

    sheet.getRow(rowIndex).height = 95;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
