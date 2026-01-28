type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export function calcInvoiceStatus(
  totalInvoice: number,
  totalBayar: number,
): InvoiceStatus {
  if (totalBayar <= 0) {
    return "Unpaid (Menunggu Pembayaran)";
  }

  if (totalBayar < totalInvoice) {
    return "Partial (Pembayaran Sebagian)";
  }

  return "Paid (Pembayaran Penuh/ Lunas)";
}
