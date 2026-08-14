import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postAset(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
): Promise<number> {
  // 1106.01.00 - Uang Muka Pembelian
  const uangMuka = await getCoaMappingDetail("ASET", "UANG_MUKA_PEMBELIAN");

  // 1101.00.00 Kas atau 1102.05.00 BNI - 1918768145
  const kasBank = await getCoaMappingDetail("ASET", "KAS");

  if (nominal <= 0) {
    throw new Error("Nominal pembayaran harus lebih besar dari 0.");
  }

  const lines: JurnalLine[] = [
    {
      id_coa: uangMuka.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: kasBank.id_coa,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit = lines.reduce((total, item) => total + item.debit, 0);
  const totalKredit = lines.reduce((total, item) => total + item.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal aset tidak balance. Debit=${totalDebit}, Kredit=${totalKredit}`,
    );
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "ASET",
    modul: "ACCOUNTING",
    lines,
  });
}
