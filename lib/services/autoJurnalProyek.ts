import { db } from "@/lib/supabase/server";

export type JurnalLine = {
  id_coa: number;
  debit: number;
  kredit: number;
};

export async function createJurnalProyek(
  tanggal: string,
  noBukti: string,
  sumber: "PROYEK" | "ARMADA" | "ALAT_BERAT",
  keterangan: string,
  idPeriode: number,
  lines: JurnalLine[],
): Promise<number> {
  if (lines.some((l) => l.debit < 0 || l.kredit < 0)) {
    throw new Error("Debit/kredit tidak boleh minus");
  }

  const totalDebit = lines.reduce((a, b) => a + b.debit, 0);
  const totalKredit = lines.reduce((a, b) => a + b.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance");
  }

  const { data: jurnal, error } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti: noBukti,
      sumber,
      keterangan,
      id_periode: idPeriode,
    })
    .select()
    .single();

  if (error || !jurnal) throw error;

  const detailRows = lines.map((l) => ({
    id_jurnal: jurnal.id_jurnal,
    id_coa: l.id_coa,
    debit: l.debit,
    kredit: l.kredit,
  }));

  const { error: errDetail } = await db
    .from("jurnal_detail")
    .insert(detailRows);
  if (errDetail) throw errDetail;

  return jurnal.id_jurnal;
}
