export type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export function calcStatus(total: number, paid: number): InvoiceStatus {
  if (paid <= 0) return "Unpaid (Menunggu Pembayaran)";
  if (paid < total) return "Partial (Pembayaran Sebagian)";
  return "Paid (Pembayaran Penuh/ Lunas)";
}
