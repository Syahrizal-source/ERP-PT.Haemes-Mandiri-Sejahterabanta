import { db } from "@/lib/supabase/server";
import { JurnalLine, JurnalSumber } from "@/types/accounting";

export interface PostJournalParams {
  tanggal: string;
  no_bukti: string;
  keterangan: string;
  sumber: JurnalSumber;
  modul?: string | null;
  ref_id?: string | null;
  id_proyek?: string | null;
  id_armada?: number | null;
  lines: JurnalLine[];
}

export async function postJournal({
  tanggal,
  no_bukti,
  keterangan,
  sumber,
  modul = null,
  ref_id = null,
  id_proyek = null,
  id_armada = null,
  lines,
}: PostJournalParams): Promise<number> {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance");
  }

  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .single();

  if (periodeError || !periode) {
    throw new Error("Periode OPEN tidak ditemukan");
  }

  const { data: jurnal, error: jurnalError } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti,
      sumber,
      keterangan,
      id_periode: periode.id_periode,
      modul,
      ref_id,
      id_proyek,
      id_armada,
      is_posted: true,
      posted_at: new Date().toISOString(),
    })
    .select("id_jurnal")
    .single();

  if (jurnalError || !jurnal) {
    console.error("JURNAL DB ERROR:", jurnalError);

    throw new Error(
      jurnalError?.message ?? "Insert jurnal gagal (unknown error)",
    );
  }

  const detailRows = lines.map((line) => ({
    id_jurnal: jurnal.id_jurnal,
    id_coa: line.id_coa,
    debit: line.debit,
    kredit: line.kredit,
    id_alat: line.id_alat ?? null,
    id_proyek: line.id_proyek ?? null,
    id_cost_center: line.id_cost_center ?? null,
  }));

  const { error: detailError } = await db
    .from("jurnal_detail")
    .insert(detailRows);

  if (detailError) {
    throw new Error(detailError.message);
  }

  return jurnal.id_jurnal;
}
