import { db } from "@/lib/supabase/server";
import { JurnalLine } from "@/types/jurnal";

export async function createJurnalProyek(
  tanggal: string,
  noBukti: string,
  sumber: "PROYEK",
  keterangan: string,
  idPeriode: number,
  idProyek: string,
  lines: JurnalLine[],
): Promise<number> {
  if (!idProyek) {
    throw new Error("id_proyek wajib untuk jurnal proyek");
  }

  if (!lines.length) {
    throw new Error("Detail jurnal tidak boleh kosong");
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance");
  }

  const { data: jurnal, error: errJurnal } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti: noBukti,
      sumber,
      keterangan,
      id_periode: idPeriode,
      id_proyek: idProyek,
    })
    .select("id_jurnal")
    .single();

  if (errJurnal || !jurnal) {
    throw new Error("Gagal insert jurnal: " + errJurnal?.message);
  }

  const detailRows = lines.map((line) => ({
    id_jurnal: jurnal.id_jurnal,
    id_coa: line.id_coa,
    debit: line.debit,
    kredit: line.kredit,
    id_proyek: idProyek,
  }));

  const { error: errDetail } = await db
    .from("jurnal_detail")
    .insert(detailRows);

  if (errDetail) {
    throw new Error("Gagal insert jurnal_detail: " + errDetail.message);
  }

  return jurnal.id_jurnal;
}
