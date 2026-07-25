import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import {
  normalizeKasArmada,
  hitungKasArmada,
  validateKasArmada,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";
import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST KAS ARMADA
========================= */
export async function postKasArmada(input: KasArmadaInput): Promise<number> {
  /* =========================
     NORMALIZE + VALIDATE
  ========================= */
  const data = normalizeKasArmada(input);
  validateKasArmada(data);

  /* =========================
     HITUNG
  ========================= */
  const hitung = hitungKasArmada(data);

  const coaKas = await getCoaMappingDetail("KAS_ARMADA", "KAS");

  const coaBeban = await getCoaMappingDetail("KAS_ARMADA", "BEBAN");

  const coaPendapatan = await getCoaMappingDetail("KAS_ARMADA", "PENDAPATAN");

  const lines: JurnalLine[] = [];

  /* =========================
     1. PENERIMAAN
  ========================= */
  if (data.penerimaan > 0) {
    lines.push(
      {
        id_coa: coaKas.id_coa,
        debit: data.penerimaan,
        kredit: 0,
      },
      {
        id_coa: coaPendapatan.id_coa,
        debit: 0,
        kredit: data.penerimaan,
      },
    );
  }

  /* =========================
     2. PENGEMBALIAN
  ========================= */
  if (data.pengembalian > 0) {
    lines.push(
      {
        id_coa: coaKas.id_coa,
        debit: data.pengembalian,
        kredit: 0,
      },
      {
        id_coa: coaBeban.id_coa,
        debit: 0,
        kredit: data.pengembalian,
      },
    );
  }

  /* =========================
     3. PENGELUARAN
  ========================= */
  if (data.pengeluaran > 0) {
    lines.push(
      {
        id_coa: coaBeban.id_coa,
        debit: data.pengeluaran,
        kredit: 0,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: data.pengeluaran,
      },
    );
  }

  /* =========================
     4. KASBON
  ========================= */
  if (data.kasbon > 0) {
    lines.push(
      {
        id_coa: coaBeban.id_coa,
        debit: data.kasbon,
        kredit: 0,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: data.kasbon,
      },
    );
  }

  /* =========================
     VALIDASI BALANCE
  ========================= */
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);

  const totalKredit = lines.reduce((sum, l) => sum + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal kas armada tidak balance");
  }

  if (lines.length === 0) {
    throw new Error("Tidak ada transaksi kas armada");
  }

  /* =========================
     POST JURNAL
  ========================= */
  const jurnalId = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `KAS-ARMADA-${Date.now()}`,
    keterangan: `Kas Armada - ${data.sopir}`,
    sumber: "KAS_ARMADA",
    modul: "KAS_ARMADA",
    lines,
  });

  return jurnalId;
}
