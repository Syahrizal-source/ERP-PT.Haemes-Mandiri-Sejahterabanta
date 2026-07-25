import { db } from "@/lib/supabase/server";

import { postJournal } from "@/lib/accounting/postJournal";

import type { JurnalLine } from "@/types/accounting";

import type {
  JurnalKoreksiInput,
  JurnalKoreksiLineInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================
   POST JURNAL KOREKSI
========================= */

export async function postJurnalKoreksi(
  input: JurnalKoreksiInput,
): Promise<number> {
  /* =========================
     VALIDASI HEADER
  ========================= */

  if (!input.id_jurnal_asal) {
    throw new Error("Jurnal asal wajib dipilih");
  }

  if (input.lines.length === 0) {
    throw new Error("Detail jurnal koreksi kosong");
  }

  /* =========================
     CEK JURNAL ASAL
  ========================= */

  const { data: jurnalAsal, error: jurnalError } = await db
    .from("jurnal")
    .select(
      `
      id_jurnal,
      no_bukti,
      is_posted
      `,
    )
    .eq("id_jurnal", input.id_jurnal_asal)
    .limit(1)
    .maybeSingle();

  if (jurnalError) {
    throw new Error(jurnalError.message);
  }

  if (!jurnalAsal) {
    throw new Error("Jurnal asal tidak ditemukan");
  }

  if (jurnalAsal.is_posted !== true) {
    throw new Error("Hanya jurnal posted yang dapat dikoreksi");
  }

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit = input.lines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.debit),
    0,
  );

  const totalKredit = input.lines.reduce(
    (sum: number, line: JurnalKoreksiLineInput): number =>
      sum + Number(line.kredit),
    0,
  );

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal koreksi tidak balance");
  }

  /* =========================
     BUILD JOURNAL LINES
  ========================= */

  const lines: JurnalLine[] = input.lines.map(
    (line: JurnalKoreksiLineInput): JurnalLine => ({
      id_coa: Number(line.id_coa),

      debit: Number(line.debit),

      kredit: Number(line.kredit),
    }),
  );

  /* =========================
     POST JURNAL
  ========================= */

  const jurnalId = await postJournal({
    tanggal: input.tanggal,

    no_bukti: input.no_bukti,

    keterangan: input.keterangan,

    sumber: "KOREKSI",

    modul: "KOREKSI",

    ref_id: null,

    lines,
  });

  /* =========================
     SIMPAN LOG KOREKSI
  ========================= */

  const { error: koreksiError } = await db.from("jurnal_koreksi").insert({
    id_jurnal_asal: input.id_jurnal_asal,

    id_jurnal_koreksi: jurnalId,

    alasan: input.alasan,
  });

  if (koreksiError) {
    throw new Error(koreksiError.message);
  }

  return jurnalId;
}
