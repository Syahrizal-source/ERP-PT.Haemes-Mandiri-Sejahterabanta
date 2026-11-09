import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";
import type { JurnalLine } from "@/types/accounting";

export async function postProyekMaster(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  id_proyek: string,
): Promise<number> {
  /* =========================================================
     VALIDASI INPUT
  ========================================================= */

  if (!tanggal.trim()) {
    throw new Error("Tanggal proyek wajib diisi");
  }

  if (!no_bukti.trim()) {
    throw new Error("Nomor bukti proyek wajib diisi");
  }

  if (!keterangan.trim()) {
    throw new Error("Keterangan proyek wajib diisi");
  }

  if (!id_proyek.trim()) {
    throw new Error("ID proyek wajib diisi");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nilai proyek harus lebih besar dari 0");
  }

  /* =========================================================
     COA MAPPING PROYEK

     WAJIB menggunakan mapping:
       PROYEK / PIUTANG
       PROYEK / PENDAPATAN

     Customer/Vendor TIDAK menentukan COA.

     id_vendor hanya relasi Master Customer/Vendor pada
     proyek_master.

     COA jurnal tetap mengikuti coa_mapping.
  ========================================================= */

  const piutangProyek = await getCoaMappingDetail("PROYEK", "PIUTANG");

  const pendapatanProyek = await getCoaMappingDetail("PROYEK", "PENDAPATAN");

  /* =========================================================
     VALIDASI HASIL MAPPING
  ========================================================= */

  if (!Number.isInteger(piutangProyek.id_coa)) {
    throw new Error("Mapping PROYEK / PIUTANG tidak memiliki COA yang valid");
  }

  if (!Number.isInteger(pendapatanProyek.id_coa)) {
    throw new Error(
      "Mapping PROYEK / PENDAPATAN tidak memiliki COA yang valid",
    );
  }

  if (piutangProyek.id_coa === pendapatanProyek.id_coa) {
    throw new Error("COA Piutang dan Pendapatan Proyek tidak boleh sama");
  }

  /* =========================================================
     JURNAL MASTER PROYEK

     DEBIT  : Piutang Usaha / Piutang Proyek
     KREDIT : Pendapatan Proyek

     id_proyek wajib diisi pada kedua detail.
  ========================================================= */

  const lines: JurnalLine[] = [
    {
      id_coa: piutangProyek.id_coa,
      debit: nominal,
      kredit: 0,
      id_proyek,
    },
    {
      id_coa: pendapatanProyek.id_coa,
      debit: 0,
      kredit: nominal,
      id_proyek,
    },
  ];

  /* =========================================================
     VALIDASI BALANCE
  ========================================================= */

  const totalDebit = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + Number(line.debit),
    0,
  );

  const totalKredit = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + Number(line.kredit),
    0,
  );

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal proyek tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  /* =========================================================
     POST JOURNAL

     postJournal akan:
     - mengambil periode OPEN
     - insert jurnal
     - insert jurnal_detail
     - set is_posted = true
  ========================================================= */

  return postJournal({
    tanggal,
    no_bukti,
    keterangan,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: id_proyek,
    id_proyek,
    lines,
  });
}
