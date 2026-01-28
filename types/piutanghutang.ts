export type InvoiceStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export interface PiutangForm {
  customer: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status: InvoiceStatus;
}

export interface PiutangRow extends PiutangForm {
  id_piutang: number;
}
