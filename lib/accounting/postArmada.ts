import { postJournal } from "./postJournal";

import { getCoaMappingDetail } from "./getcoamapping";

import {
  normalizeArmada,
  hitungArmada,
  validateArmada,
  type ArmadaInput,
} from "@/lib/validators/armada";

import type { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST ARMADA
 * ============================================================
 *
 * Flow accounting final:
 *
 *   Cr Kas Kecil Bu Butet
 *   Dr Beban Armada
 *
 * Urutan detail jurnal:
 *
 *   1. Kas Kecil Bu Butet
 *   2. Beban Armada
 *
 * COA bersumber dari public.coa_mapping.
 *
 * Mapping yang digunakan:
 *
 *   KAS_ARMADA / BEBAN
 *       -> 61101 Beban Armada
 *
 *   KAS_ARMADA / KAS_ARMADA_BU_BUTET
 *       -> 1101.03.04 Kas Kecil Bu Butet
 *
 * Tidak menggunakan:
 *
 *   ARMADA / PENDAPATAN
 *   KAS_ARMADA / PENDAPATAN
 *
 * karena Pendapatan Armada 41101 sudah inactive.
 *
 * Catatan:
 *   jumlah_tagihan tidak diposting sebagai pendapatan pada flow
 *   ini. Nilai yang diposting adalah jumlah_uang_jalan sebagai
 *   beban yang dibayar melalui Kas Armada.
 * ============================================================
 */
export async function postArmada(input: ArmadaInput): Promise<number> {
  /* ==========================================================
     1. NORMALIZE & VALIDATE
     ========================================================== */

  const data = normalizeArmada(input);

  validateArmada(data);

  /* ==========================================================
     2. HITUNG TRANSAKSI ARMADA
     ========================================================== */

  const hitung = hitungArmada(data);

  const beban = hitung.jumlah_uang_jalan;

  /**
   * jumlah_tagihan sengaja tidak digunakan sebagai pendapatan.
   *
   * Pendapatan Armada 41101 sudah inactive dan flow ini adalah
   * pembayaran biaya / uang jalan Armada.
   */
  if (!Number.isFinite(beban)) {
    throw new Error("Nilai uang jalan Armada tidak valid.");
  }

  if (beban < 0) {
    throw new Error("Nilai uang jalan Armada tidak boleh negatif.");
  }

  if (beban <= 0) {
    throw new Error("Tidak ada nilai uang jalan Armada.");
  }

  /* ==========================================================
     3. AMBIL COA DARI coa_mapping
     ========================================================== */

  /**
   * Beban Armada
   *
   * KAS_ARMADA / BEBAN
   * -> 61101 Beban Armada
   */
  const coaBeban = await getCoaMappingDetail("KAS_ARMADA", "BEBAN");

  /**
   * Kas Armada Bu Butet
   *
   * KAS_ARMADA / KAS_ARMADA_BU_BUTET
   * -> 1101.03.04 Kas Kecil Bu Butet
   */
  const coaKas = await getCoaMappingDetail("KAS_ARMADA", "KAS_ARMADA_BU_BUTET");

  /* ==========================================================
     4. BUILD JURNAL
     ========================================================== */

  /**
   * Urutan detail jurnal sengaja:
   *
   * 1. Kas Kecil Bu Butet
   * 2. Beban Armada
   *
   * Secara accounting tetap:
   *
   *   Dr Beban Armada
   *   Cr Kas Kecil Bu Butet
   *
   * Hanya urutan tampilan/detail yang disusun
   * Kas terlebih dahulu.
   */
  const lines: JurnalLine[] = [
    {
      /**
       * Kredit:
       * Kas Kecil Bu Butet
       */
      id_coa: coaKas.id_coa,
      debit: 0,
      kredit: beban,
    },
    {
      /**
       * Debit:
       * Beban Armada
       */
      id_coa: coaBeban.id_coa,
      debit: beban,
      kredit: 0,
    },
  ];

  /* ==========================================================
     5. VALIDASI DETAIL JURNAL
     ========================================================== */

  if (lines.length !== 2) {
    throw new Error("Detail jurnal Armada tidak lengkap.");
  }

  for (const line of lines) {
    if (!Number.isInteger(line.id_coa) || line.id_coa <= 0) {
      throw new Error("COA jurnal Armada tidak valid.");
    }

    if (!Number.isFinite(line.debit) || line.debit < 0) {
      throw new Error("Nilai debit jurnal Armada tidak valid.");
    }

    if (!Number.isFinite(line.kredit) || line.kredit < 0) {
      throw new Error("Nilai kredit jurnal Armada tidak valid.");
    }

    if (line.debit > 0 && line.kredit > 0) {
      throw new Error(
        "Satu detail jurnal tidak boleh memiliki debit dan kredit sekaligus.",
      );
    }

    if (line.debit === 0 && line.kredit === 0) {
      throw new Error("Detail jurnal Armada tidak boleh bernilai nol.");
    }
  }

  /* ==========================================================
     6. VALIDASI BALANCE
     ========================================================== */

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (!Number.isFinite(totalDebit)) {
    throw new Error("Total debit jurnal Armada tidak valid.");
  }

  if (!Number.isFinite(totalKredit)) {
    throw new Error("Total kredit jurnal Armada tidak valid.");
  }

  /**
   * Gunakan toleransi kecil untuk keamanan
   * floating point.
   */
  const selisih = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal Armada tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error(
      "Jurnal Armada harus memiliki debit dan kredit lebih besar dari nol.",
    );
  }

  /* ==========================================================
     7. POST JOURNAL
     ========================================================== */

  const jurnalId = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `ARMADA-${data.kode_transaksi}`,
    keterangan: `Armada - ${data.no_polisi} - ${data.supir}`,
    sumber: "ARMADA",
    modul: "ARMADA",
    lines,
  });

  /* ==========================================================
     8. RETURN JOURNAL ID
     ========================================================== */

  return jurnalId;
}
