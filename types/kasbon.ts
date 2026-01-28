export type KasbonRow = {
  id: string;
  tanggal: string;
  deskripsi: string;
  no_voucher: string;
  debit: number;
  kredit: number;
  saldo?: number;
};