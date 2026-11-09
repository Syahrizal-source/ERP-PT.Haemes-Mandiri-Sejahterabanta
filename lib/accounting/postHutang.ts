import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postHutang(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  idVendor?: number | null,
): Promise<number> {
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal hutang tidak valid");
  }

  const beban = await getCoaMappingDetail("HUTANG", "BEBAN");
  const hutang = await getCoaMappingDetail("HUTANG", "HUTANG");

  const lines: JurnalLine[] = [
    {
      id_coa: beban.id_coa,
      debit: nominal,
      kredit: 0,
      id_vendor: idVendor ?? null,
    },
    {
      id_coa: hutang.id_coa,
      debit: 0,
      kredit: nominal,
      id_vendor: idVendor ?? null,
    },
  ];

  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine) => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal hutang tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "HUTANG",
    modul: "HUTANG",
    lines,
  });
}
