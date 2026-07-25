import { postJournal } from "./postJournal";

import { getCoaMappingDetail } from "./getcoamapping";

import { JurnalLine } from "@/types/accounting";

import {
  PiutangProyekInput,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

/* =========================
   POST PIUTANG PROYEK
========================= */

export async function postPiutangProyek(
  data: PiutangProyekInput,
): Promise<number> {
  /* =========================
     VALIDASI
  ========================= */

  validatePiutangProyek(data);

  if (Number(data.nilai_piutang) <= 0) {
    throw new Error("Nilai piutang tidak valid");
  }

  /* =========================
     COA MAPPING
  ========================= */

  const coaPiutang = await getCoaMappingDetail("PIUTANG_PROYEK", "PIUTANG");

  const coaPendapatan = await getCoaMappingDetail(
    "PIUTANG_PROYEK",
    "PENDAPATAN",
  );

  /* =========================
     JURNAL PIUTANG
  ========================= */

  const lines: JurnalLine[] = [
    {
      id_coa: coaPiutang.id_coa,

      debit: Number(data.nilai_piutang),

      kredit: 0,
    },

    {
      id_coa: coaPendapatan.id_coa,

      debit: 0,

      kredit: Number(data.nilai_piutang),
    },
  ];

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal piutang proyek tidak balance");
  }

  /* =========================
     POST JURNAL
  ========================= */

  const idJurnal = await postJournal({
    tanggal: data.tanggal,

    no_bukti: `PP-${Date.now()}`,

    keterangan: data.keterangan ?? `Piutang proyek - ${data.customer}`,

    sumber: "PIUTANG_PROYEK",

    modul: "ACCOUNTING",

    lines,
  });

  /* =========================
     PEMBAYARAN
  ========================= */

  if (Number(data.penerimaan) > 0) {
    const coaKas = await getCoaMappingDetail("PIUTANG_PROYEK", "KAS");

    const pembayaranLines: JurnalLine[] = [
      {
        id_coa: coaKas.id_coa,

        debit: Number(data.penerimaan),

        kredit: 0,
      },

      {
        id_coa: coaPiutang.id_coa,

        debit: 0,

        kredit: Number(data.penerimaan),
      },
    ];

    const totalDebitBayar = pembayaranLines.reduce(
      (sum, line) => sum + Number(line.debit),
      0,
    );

    const totalKreditBayar = pembayaranLines.reduce(
      (sum, line) => sum + Number(line.kredit),
      0,
    );

    if (totalDebitBayar !== totalKreditBayar) {
      throw new Error("Jurnal pembayaran piutang proyek tidak balance");
    }

    await postJournal({
      tanggal: data.tanggal_pembayaran ?? data.tanggal,

      no_bukti: `BYR-PP-${Date.now()}`,

      keterangan: `Pembayaran piutang proyek - ${data.customer}`,

      sumber: "PIUTANG_PROYEK",

      modul: "ACCOUNTING",

      lines: pembayaranLines,
    });
  }

  return idJurnal;
}
