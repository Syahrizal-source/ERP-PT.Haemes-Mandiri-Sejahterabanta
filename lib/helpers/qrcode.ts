import crypto from "crypto";

export type QRSource = {
  id: number;
  sumber_modul: string;
  nilai_transaksi: number;
  tanggal_transaksi: string;
};

export function generateQRCodeValue(trx: QRSource): string {
  return crypto
    .createHash("sha256")
    .update(
      `${trx.id}|${trx.sumber_modul}|${trx.nilai_transaksi}|${trx.tanggal_transaksi}`
    )
    .digest("hex");
}
