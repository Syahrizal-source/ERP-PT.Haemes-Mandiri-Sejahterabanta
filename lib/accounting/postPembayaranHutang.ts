import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postPembayaranHutang(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
): Promise<number> {
  const kas = await getCoaMappingDetail("PEMBAYARAN_HUTANG", "KAS");
  const hutang = await getCoaMappingDetail("PEMBAYARAN_HUTANG", "HUTANG");

  const totalHutang: number = nominal + ppn;
  const kasKeluar: number = totalHutang - pph23;

  const lines: JurnalLine[] = [
    {
      id_coa: hutang.id_coa,
      debit: totalHutang,
      kredit: 0,
    },
    {
      id_coa: kas.id_coa,
      debit: 0,
      kredit: kasKeluar,
    },
    {
      id_coa: hutang.id_coa,
      debit: 0,
      kredit: pph23,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal pembayaran hutang tidak balance");
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PEMBAYARAN_HUTANG", // tetap beda di laporan
    modul: "PENDAPATAN", // ✅ pakai mapping yg sudah ada
    lines,
  });
}
