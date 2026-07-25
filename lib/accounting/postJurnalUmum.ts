import { db } from "@/lib/supabase/server";

import type { JurnalLine } from "@/types/accounting";

/* =========================
   TYPES
========================= */

interface JurnalHeaderResult {
  id_jurnal: number;
}

interface PeriodeRow {
  id_periode: number;
  status: "OPEN" | "CLOSED";
}

/* =========================
   POST JURNAL UMUM
========================= */

export async function postJurnalUmum(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  lines: JurnalLine[],
): Promise<number> {
  /* =========================
     VALIDASI LINE
  ========================= */

  if (lines.length === 0) {
    throw new Error("Jurnal tidak memiliki baris");
  }

  /* =========================
     VALIDASI BALANCE
  ========================= */

  const totalDebit: number = lines.reduce(
    (sum, line) => sum + Number(line.debit ?? 0),
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum, line) => sum + Number(line.kredit ?? 0),
    0,
  );

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance");
  }

  /* =========================
     AMBIL PERIODE OPEN
  ========================= */

  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("status", "OPEN")
    .single<PeriodeRow>();

  if (periodeError || !periode) {
    console.error("PERIODE ERROR:", periodeError);

    throw new Error("Periode OPEN tidak ditemukan");
  }

  if (periode.status !== "OPEN") {
    throw new Error("Periode sudah CLOSED");
  }

  /* =========================
     INSERT HEADER
  ========================= */

  const { data: jurnal, error: jurnalError } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti,

      keterangan,

      sumber: "PENUTUP",

      id_periode: periode.id_periode,

      is_posted: true,

      posted_at: new Date().toISOString(),
    })
    .select("id_jurnal")
    .single<JurnalHeaderResult>();

  if (jurnalError || !jurnal) {
    console.error("INSERT JURNAL ERROR:", jurnalError);

    throw new Error(jurnalError?.message ?? "Gagal membuat jurnal");
  }

  const jurnalId: number = Number(jurnal.id_jurnal);

  /* =========================
     INSERT DETAIL
  ========================= */

  const jurnalLines = lines.map((line) => ({
    id_jurnal: jurnalId,

    id_coa: line.id_coa,

    debit: Number(line.debit ?? 0),

    kredit: Number(line.kredit ?? 0),

    id_alat: line.id_alat ?? null,

    id_proyek: line.id_proyek ?? null,

    id_cost_center: line.id_cost_center ?? null,
  }));

  const { error: lineError } = await db
    .from("jurnal_detail")
    .insert(jurnalLines);

  if (lineError) {
    console.error("INSERT DETAIL ERROR:", lineError);

    /*
      ROLLBACK HEADER
    */
    await db.from("jurnal").delete().eq("id_jurnal", jurnalId);

    throw new Error(lineError.message);
  }

  /* =========================
     SUCCESS
  ========================= */

  return jurnalId;
}
