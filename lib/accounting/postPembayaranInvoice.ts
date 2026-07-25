import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import { JurnalLine } from "@/types/accounting";

export async function postPembayaranInvoice(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  ppn: number,
  pph23: number,
): Promise<number> {
  const kas = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "KAS");
  const piutang = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "PIUTANG");
  const pajak = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "PAJAK");
  const hutang = await getCoaMappingDetail("PEMBAYARAN_INVOICE", "HUTANG");

  const kasMasuk: number = nominal + ppn - pph23;

  if (kasMasuk <= 0) {
    throw new Error("Nilai pembayaran tidak valid");
  }

  const lines: JurnalLine[] = [
    /* =========================
       KAS (DEBIT)
    ========================= */
    {
      id_coa: kas.id_coa,
      debit: kasMasuk,
      kredit: 0,
    },

    /* =========================
       PIUTANG (KREDIT)
    ========================= */
    {
      id_coa: piutang.id_coa,
      debit: 0,
      kredit: nominal,
    },

    /* =========================
       PPN (KREDIT - PAJAK!)
    ========================= */
    {
      id_coa: pajak.id_coa,
      debit: 0,
      kredit: ppn,
    },

    /* =========================
       PPH23 (DEBIT)
    ========================= */
    {
      id_coa: hutang.id_coa,
      debit: pph23,
      kredit: 0,
    },
  ];

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal pembayaran invoice tidak balance");
  }

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PEMBAYARAN_INVOICE",
    modul: "PENDAPATAN",
    lines,
  });
}
