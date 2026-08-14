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
  // =====================================================
  // VALIDASI DASAR
  // =====================================================

  if (lines.length === 0) {
    throw new Error("Jurnal harus memiliki minimal satu detail.");
  }

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nilai debit atau kredit tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Total debit dan kredit harus lebih besar dari 0.");
  }

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal tidak balance.");
  }

  // =====================================================
  // IDENTIFIKASI TRANSAKSI PROYEK
  // =====================================================

  const isProyek =
    modul === "PROYEK" || sumber === "PROYEK" || sumber === "PIUTANG_PROYEK";

  // =====================================================
  // VALIDASI KHUSUS PROYEK
  // =====================================================

  if (isProyek) {
    if (!id_proyek) {
      throw new Error("Jurnal PROYEK wajib memiliki id_proyek.");
    }

    // ---------------------------------------------------
    // PASTIKAN PROYEK ADA
    // ---------------------------------------------------

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")
      .eq("id", id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    // ---------------------------------------------------
    // VALIDASI COA PROYEK
    // ---------------------------------------------------

    const coaIds = [...new Set(lines.map((line) => Number(line.id_coa)))];

    if (coaIds.some((idCoa) => !Number.isFinite(idCoa))) {
      throw new Error("Terdapat id_coa yang tidak valid.");
    }

    const { data: proyekCoa, error: proyekCoaError } = await db
      .from("proyek_coa")
      .select("id_coa")
      .eq("id_proyek", id_proyek)
      .eq("aktif", true)
      .in("id_coa", coaIds);

    if (proyekCoaError) {
      throw new Error(`Gagal memeriksa COA proyek: ${proyekCoaError.message}`);
    }

    const coaProyekSet = new Set(
      (proyekCoa ?? []).map((row) => Number(row.id_coa)),
    );

    const coaTidakTerdaftar = coaIds.filter(
      (idCoa) => !coaProyekSet.has(idCoa),
    );

    if (coaTidakTerdaftar.length > 0) {
      throw new Error(
        `COA tidak terdaftar pada proyek ${proyek.kode_proyek}: ${coaTidakTerdaftar.join(
          ", ",
        )}.`,
      );
    }
  }

  // =====================================================
  // PERIODE OPEN
  // =====================================================

  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .single();

  if (periodeError || !periode) {
    throw new Error("Periode OPEN tidak ditemukan.");
  }

  // =====================================================
  // INSERT JURNAL HEADER
  // =====================================================

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

  // =====================================================
  // JURNAL DETAIL
  // =====================================================

  const detailRows = lines.map((line) => ({
    id_jurnal: jurnal.id_jurnal,
    id_coa: Number(line.id_coa),
    debit: Number(line.debit),
    kredit: Number(line.kredit),

    // Untuk PROYEK selalu gunakan id_proyek
    // dari header jurnal.
    id_proyek: isProyek ? id_proyek : (line.id_proyek ?? null),

    id_alat: line.id_alat ?? null,
    id_cost_center: line.id_cost_center ?? null,
  }));

  // =====================================================
  // INSERT JURNAL DETAIL
  // =====================================================

  const { error: detailError } = await db
    .from("jurnal_detail")
    .insert(detailRows);

  if (detailError) {
    throw new Error(`Gagal menyimpan jurnal detail: ${detailError.message}`);
  }

  return Number(jurnal.id_jurnal);
}
