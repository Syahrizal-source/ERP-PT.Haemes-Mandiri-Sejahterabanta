import { validateMoney } from "@/lib/money";

export function validateKasArmada(data: {
  tanggal: string;
  sopir: string;
  penerimaan: bigint;
  pengembalian: bigint;
  pengeluaran: bigint;
  kasbon: bigint;
}) {
  if (!data.tanggal) throw new Error("Tanggal wajib diisi");
  if (!data.sopir) throw new Error("Sopir wajib diisi");

  validateMoney(data.penerimaan, "Penerimaan");
  validateMoney(data.pengembalian, "Pengembalian");
  validateMoney(data.pengeluaran, "Pengeluaran");
  validateMoney(data.kasbon, "Kasbon");
}
