import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import {
  normalizeArmada,
  hitungArmada,
  validateArmada,
  type ArmadaInput,
} from "@/lib/validators/armada";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST ARMADA (NO CLEARING)
========================= */
export async function postArmada(input: ArmadaInput): Promise<number> {
  const data = normalizeArmada(input);
  validateArmada(data);

  const hitung = hitungArmada(data);

  const pendapatan: number = hitung.jumlah_tagihan;
  const beban: number = hitung.jumlah_uang_jalan;

  if (pendapatan <= 0 && beban <= 0) {
    throw new Error("Tidak ada nilai transaksi armada");
  }

  /* =========================
     COA (HANYA ARMADA)
  ========================= */
  const coaPendapatan = await getCoaMappingDetail("ARMADA", "PENDAPATAN");

  const coaBeban = await getCoaMappingDetail("ARMADA", "BEBAN");

  const lines: JurnalLine[] = [];

  /* =========================
     1. BEBAN (DEBIT)
  ========================= */
  if (beban > 0) {
    lines.push({
      id_coa: coaBeban.id_coa,
      debit: beban,
      kredit: 0,
    });
  }

  /* =========================
     2. PENDAPATAN (KREDIT)
  ========================= */
  if (pendapatan > 0) {
    lines.push({
      id_coa: coaPendapatan.id_coa,
      debit: 0,
      kredit: pendapatan,
    });
  }

  /* =========================
     3. PENYEIMBANG (ANTI ERROR)
  ========================= */
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    const selisih = Math.abs(totalDebit - totalKredit);

    /* =========================
       Kalau debit < kredit → tambah debit
    ========================= */
    if (totalDebit < totalKredit) {
      lines.push({
        id_coa: coaBeban.id_coa,
        debit: selisih,
        kredit: 0,
      });
    }

    /* =========================
       Kalau kredit < debit → tambah kredit
    ========================= */
    if (totalKredit < totalDebit) {
      lines.push({
        id_coa: coaPendapatan.id_coa,
        debit: 0,
        kredit: selisih,
      });
    }
  }

  /* =========================
     VALIDASI FINAL
  ========================= */
  const finalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const finalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (finalDebit !== finalKredit) {
    throw new Error("Jurnal tidak balance (fatal)");
  }

  /* =========================
     POST
  ========================= */
  const jurnalId = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `ARMADA-${data.kode_transaksi}`,
    keterangan: `Armada - ${data.no_polisi} - ${data.supir}`,
    sumber: "ARMADA",
    modul: "ARMADA",
    lines,
  });

  return jurnalId;
}
