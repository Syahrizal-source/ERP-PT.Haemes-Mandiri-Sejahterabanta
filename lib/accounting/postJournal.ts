import { db } from "@/lib/supabase/server";

import type { JurnalLine, JurnalSumber } from "@/types/accounting";

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

/**

 * ============================================================

 * POST JOURNAL

 * ============================================================

 *

 * Fungsi utama untuk membuat:

 *

 *   jurnal

 *      ↓

 *   jurnal_detail

 *

 * Untuk transaksi PROYEK:

 *

 *   - wajib mempunyai id_proyek

 *   - proyek harus tersedia

 *   - COA harus valid

 *   - COA yang berasal dari mapping PROYEK

 *     tetap diperbolehkan digunakan

 *

 * Tidak ada hardcode kode COA di fungsi ini.

 * ============================================================

 */

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
  // ==========================================================

  // VALIDASI DASAR

  // ==========================================================

  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error("Jurnal harus memiliki minimal dua detail.");
  }

  // ----------------------------------------------------------

  // Validasi setiap baris

  // ----------------------------------------------------------

  for (const line of lines) {
    const idCoa = Number(line.id_coa);

    const debit = Number(line.debit);

    const kredit = Number(line.kredit);

    if (!Number.isInteger(idCoa) || idCoa <= 0) {
      throw new Error("Terdapat id_coa yang tidak valid.");
    }

    if (!Number.isFinite(debit) || debit < 0) {
      throw new Error(`Nilai debit untuk COA ${idCoa} tidak valid.`);
    }

    if (!Number.isFinite(kredit) || kredit < 0) {
      throw new Error(`Nilai kredit untuk COA ${idCoa} tidak valid.`);
    }

    if (debit === 0 && kredit === 0) {
      throw new Error(
        `Detail jurnal COA ${idCoa} tidak boleh memiliki debit dan kredit 0.`,
      );
    }

    if (debit > 0 && kredit > 0) {
      throw new Error(
        `Detail jurnal COA ${idCoa} tidak boleh memiliki debit dan kredit sekaligus.`,
      );
    }
  }

  // ==========================================================

  // VALIDASI BALANCE

  // ==========================================================

  const totalDebit = Number(
    lines.reduce((sum, line) => sum + Number(line.debit), 0).toFixed(2),
  );

  const totalKredit = Number(
    lines.reduce((sum, line) => sum + Number(line.kredit), 0).toFixed(2),
  );

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nilai debit atau kredit tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Total debit dan kredit harus lebih besar dari 0.");
  }

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  // ==========================================================

  // IDENTIFIKASI TRANSAKSI PROYEK

  // ==========================================================

  const isProyek =
    modul === "PROYEK" || sumber === "PROYEK" || sumber === "PIUTANG_PROYEK";

  // ==========================================================

  // VALIDASI KHUSUS PROYEK

  // ==========================================================

  let proyekKode: string | null = null;

  if (isProyek) {
    // --------------------------------------------------------

    // ID PROYEK WAJIB

    // --------------------------------------------------------

    if (!id_proyek) {
      throw new Error("Jurnal PROYEK wajib memiliki id_proyek.");
    }

    // --------------------------------------------------------

    // PASTIKAN PROYEK ADA

    // --------------------------------------------------------

    const { data: proyek, error: proyekError } = await db

      .from("proyek_master")

      .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")

      .eq("id", id_proyek)

      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    proyekKode = proyek.kode_proyek;

    // --------------------------------------------------------

    // VALIDASI COA

    // --------------------------------------------------------

    //

    // Kita TIDAK lagi membatasi COA hanya berdasarkan

    // proyek_coa.

    //

    // Alasannya:

    //

    // COA untuk transaksi proyek dapat berasal dari:

    //

    //   1. proyek_coa

    //   2. coa_mapping modul PROYEK

    //

    // Contoh:

    //

    // PROYEK / PPH4

    //        ↓

    //     id_coa 1214

    //

    // COA tersebut harus tetap dapat diposting walaupun

    // belum tercatat di proyek_coa.

    //

    // Tidak ada kode COA yang di-hardcode di sini.

    // --------------------------------------------------------

    const coaIds = [...new Set(lines.map((line) => Number(line.id_coa)))];

    if (coaIds.length === 0) {
      throw new Error("Tidak terdapat COA pada jurnal.");
    }

    // --------------------------------------------------------

    // PASTIKAN COA BENAR-BENAR ADA

    // --------------------------------------------------------

    const { data: coaRows, error: coaError } = await db

      .from("coa")

      .select("id_coa")

      .in("id_coa", coaIds);

    if (coaError) {
      throw new Error(`Gagal memeriksa COA: ${coaError.message}`);
    }

    const coaValidSet = new Set(
      (coaRows ?? []).map((row) => Number(row.id_coa)),
    );

    const coaTidakValid = coaIds.filter((idCoa) => !coaValidSet.has(idCoa));

    if (coaTidakValid.length > 0) {
      throw new Error(
        `COA tidak ditemukan pada master COA untuk proyek ${proyekKode}: ${coaTidakValid.join(
          ", ",
        )}.`,
      );
    }
  }

  // ==========================================================

  // PERIODE OPEN

  // ==========================================================

  const { data: periode, error: periodeError } = await db

    .from("periode")

    .select("id_periode")

    .eq("status", "OPEN")

    .single();

  if (periodeError || !periode) {
    throw new Error("Periode OPEN tidak ditemukan.");
  }

  // ==========================================================

  // INSERT JURNAL HEADER

  // ==========================================================

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

    throw new Error(jurnalError?.message ?? "Insert jurnal gagal.");
  }

  // ==========================================================

  // JURNAL DETAIL

  // ==========================================================

  const detailRows = lines.map((line) => ({
    id_jurnal: jurnal.id_jurnal,

    id_coa: Number(line.id_coa),

    debit: Number(line.debit),

    kredit: Number(line.kredit),

    /**

     * Untuk transaksi PROYEK:

     *

     * gunakan id_proyek dari header.

     *

     * Ini menjaga seluruh detail jurnal tetap

     * terisolasi pada proyek yang sedang diproses.

     */

    id_proyek: isProyek ? id_proyek : (line.id_proyek ?? null),

    id_alat: line.id_alat ?? null,

    id_cost_center: line.id_cost_center ?? null,
  }));

  // ==========================================================

  // INSERT JURNAL DETAIL

  // ==========================================================

  const { error: detailError } = await db

    .from("jurnal_detail")

    .insert(detailRows);

  if (detailError) {
    /**

     * Header jurnal sudah dibuat tetapi detail gagal.

     *

     * Hapus header agar tidak meninggalkan jurnal

     * tanpa detail.

     */

    await db.from("jurnal").delete().eq("id_jurnal", jurnal.id_jurnal);

    throw new Error(`Gagal menyimpan jurnal detail: ${detailError.message}`);
  }

  // ==========================================================

  // SELESAI

  // ==========================================================

  return Number(jurnal.id_jurnal);
}
