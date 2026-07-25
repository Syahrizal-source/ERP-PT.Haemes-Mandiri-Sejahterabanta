import { postJournal } from "./postJournal";

import { getCoaMappingDetail } from "./getcoamapping";

import type { HutangLeasingInput } from "@/types/leasing";

import type { JurnalLine } from "@/types/accounting";

/* =========================
   POST HUTANG LEASING
========================= */

export async function postHutangLeasing(
  input: HutangLeasingInput,
): Promise<number> {
  /* =========================
     COA
  ========================= */

  const coaAset = await getCoaMappingDetail("HUTANG_LEASING", "ASET");

  const coaHutang = await getCoaMappingDetail("HUTANG_LEASING", "HUTANG");

  const coaKas = await getCoaMappingDetail("HUTANG_LEASING", "KAS");

  /* =========================
     NILAI
  ========================= */

  const nilaiAset: number = Number(input.hutang_pokok);

  const uangMuka: number = Number(input.uang_muka);

  /* =========================
     HUTANG LEASING
     = ASET - DP
  ========================= */

  const hutangLeasing: number = nilaiAset - uangMuka;

  if (hutangLeasing < 0) {
    throw new Error("Hutang leasing tidak valid");
  }

  /* =========================
     JURNAL
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaAset.id_coa,

      debit: nilaiAset,

      kredit: 0,
    },

    {
      id_coa: coaKas.id_coa,

      debit: 0,

      kredit: uangMuka,
    },

    {
      id_coa: coaHutang.id_coa,

      debit: 0,

      kredit: hutangLeasing,
    },
  ];

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal hutang leasing tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  return postJournal({
    tanggal: input.tanggal,

    no_bukti: input.no_kontrak,

    keterangan: `Hutang Leasing - ${input.nama_pt_leasing}`,

    sumber: "HUTANG_LEASING",

    modul: "HUTANG_LEASING",

    lines,
  });
}
