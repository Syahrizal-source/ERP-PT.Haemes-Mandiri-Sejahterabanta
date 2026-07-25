import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   PINJAMAN NON BANK (FINAL STABLE)
========================= */

export async function postPinjamanNonBank(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  bungaPersen: number,
): Promise<{
  total_bunga: number;
  total_pinjaman: number;
  saldo: number;
  jurnal_id: number;
}> {
  try {
    /* =========================
       HITUNG
    ========================= */
    const totalBunga: number = (nominal * bungaPersen) / 100;
    const totalPinjaman: number = nominal + totalBunga;
    const saldo: number = totalPinjaman;

    if (nominal <= 0) {
      throw new Error("Nominal tidak valid");
    }

    /* =========================
       COA (WAJIB ADA)
    ========================= */
    const coaKas = await getCoaMappingDetail("PINJAMAN", "KAS");
    const coaHutang = await getCoaMappingDetail("PINJAMAN", "HUTANG");
    const coaBeban = await getCoaMappingDetail("PINJAMAN", "BEBAN");

    /* =========================
       JURNAL (PASTI BALANCE)
    ========================= */
    const lines: JurnalLine[] = [
      {
        id_coa: coaKas.id_coa,
        debit: nominal,
        kredit: 0,
      },
      {
        id_coa: coaBeban.id_coa,
        debit: totalBunga,
        kredit: 0,
      },
      {
        id_coa: coaHutang.id_coa,
        debit: 0,
        kredit: totalPinjaman,
      },
    ];

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

    if (totalDebit !== totalKredit) {
      throw new Error("Jurnal tidak balance (pinjaman)");
    }

    /* =========================
       POST JURNAL
    ========================= */
    const jurnalId = await postJournal({
      tanggal,
      no_bukti,
      keterangan,
      sumber: "PINJAMAN",
      modul: "ACCOUNTING", // 🔥 FIX (PASTI ADA DI DB)
      ref_id: null, // 🔥 FIX (hindari constraint)
      lines,
    });

    return {
      total_bunga: totalBunga,
      total_pinjaman: totalPinjaman,
      saldo,
      jurnal_id: jurnalId,
    };
  } catch (err) {
    console.error("POST PINJAMAN ERROR:", err);
    throw err;
  }
}
