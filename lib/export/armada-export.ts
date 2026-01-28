import ExcelJS from "exceljs";
import QRCode from "qrcode";
import type { ArmadaRow } from "@/types/armada";

export async function buildArmadaExcelWithQR(
  rows: ArmadaRow[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Armada");

  ws.addRow([
    "Tanggal",
    "Kode",
    "No Polisi",
    "No Pintu",
    "Supir",
    "HP",
    "Buangan",
    "M³",
    "Rit",
    "Tagihan",
    "Uang Jalan",
    "Belanja",
    "DO Qty",
    "MEL",
    "Tambal Ban",
    "Inap/UM",
    "Sub Bak Besar",
    "Perg Solar",
    "Kaca Film/Bemper",
    "Sparepart",
    "Koordinasi",
    "ADM",
    "STNK/KIR",
    "Jumlah Tagihan",
    "Jumlah Uang Jalan",
    "Jumlah DO",
    "Bersih",
  ]);

  rows.forEach((r) => {
    ws.addRow([
      r.tanggal,
      r.kode_transaksi,
      r.no_polisi,
      r.no_pintu,
      r.supir,
      r.hp ?? "",
      r.buangan_galian,
      r["m³"],
      r.rit,
      r.tagihan,
      r.uang_jalan,
      r.belanja,
      r.do_qty,
      r.mel,
      r.tambal_ban,
      r.inap_um,
      r.sub_bak_besar,
      r.perg_solar,
      r.kaca_film_bemper,
      r.sparepart,
      r.koordinasi,
      r.adm,
      r.stnk_kir,
      r.jumlah_tagihan,
      r.jumlah_uang_jalan,
      r.jumlah_do,
      r.bersih,
    ]);
  });

  const qr = await QRCode.toDataURL(
    "EXPORT ARMADA " + new Date().toISOString(),
  );
  const img = wb.addImage({ base64: qr.split(",")[1], extension: "png" });
  ws.addImage(img, {
    tl: { col: 27, row: 1 },
    ext: { width: 120, height: 120 },
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
