import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, type KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";

import {
  proyekProgressSchema,
  type ProyekProgressRequest,
} from "@/lib/validators/proyekprogress";

type PostProgressRequest = ProyekProgressRequest & {
  id_progress: string;
};

export async function postProgress(data: PostProgressRequest): Promise<number> {
  // =====================================================
  // VALIDASI REQUEST
  // =====================================================

  const payload = proyekProgressSchema.parse(data);

  // =====================================================
  // AMBIL DATA PROGRESS
  // =====================================================

  const { data: progress, error: progressError } = await db
    .from("proyek_progress")
    .select(
      `
      id,
      id_proyek,
      tanggal,
      no_bukti,
      nilai_progress,
      metode_pembayaran,
      keterangan,
      id_jurnal
      `,
    )
    .eq("id", data.id_progress)
    .single();

  if (progressError || !progress) {
    throw new Error("Data progress proyek tidak ditemukan.");
  }

  // =====================================================
  // VALIDASI PROYEK
  // =====================================================

  if (progress.id_proyek !== payload.id_proyek) {
    throw new Error("Progress tidak sesuai dengan proyek.");
  }

  // =====================================================
  // CEGAH POSTING ULANG
  // =====================================================

  if (progress.id_jurnal !== null) {
    throw new Error(`Progress ${progress.no_bukti} sudah diposting ke jurnal.`);
  }

  // =====================================================
  // NILAI PROGRESS
  // =====================================================

  const total = Number(progress.nilai_progress);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Nilai progress harus lebih besar dari 0.");
  }

  // =====================================================
  // COA DEBIT
  // =====================================================
  // Progress proyek menggunakan WIP
  // =====================================================

  const coaWip = await getCoaMappingDetail("PROYEK", "WIP");

  // =====================================================
  // COA KREDIT
  // =====================================================

  let kategoriCoa: KategoriCoa;

  switch (progress.metode_pembayaran) {
    case "KAS":
      kategoriCoa = "KAS";
      break;

    case "KAS_BESAR":
      kategoriCoa = "KAS_BESAR";
      break;

    case "KAS_KECIL":
      kategoriCoa = "KAS_KECIL";
      break;

    case "BANK":
      kategoriCoa = "BANK";
      break;

    case "HUTANG":
      kategoriCoa = "HUTANG";
      break;

    default:
      throw new Error(
        `Metode pembayaran ${String(
          progress.metode_pembayaran,
        )} tidak memiliki mapping COA.`,
      );
  }

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  // =====================================================
  // JURNAL
  // =====================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaWip.id_coa,
      debit: total,
      kredit: 0,
      id_proyek: progress.id_proyek,
    },
    {
      id_coa: coaLawan.id_coa,
      debit: 0,
      kredit: total,
      id_proyek: progress.id_proyek,
    },
  ];

  // =====================================================
  // VALIDASI BALANCE
  // =====================================================

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nilai jurnal progress tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Debit dan kredit harus lebih besar dari 0.");
  }

  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal progress tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  // =====================================================
  // POST JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: progress.tanggal,
    no_bukti: progress.no_bukti,
    keterangan: `Progress: ${progress.keterangan ?? "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: progress.id,
    id_proyek: progress.id_proyek,
    lines,
  });

  // =====================================================
  // HUBUNGKAN JURNAL KE PROGRESS
  // =====================================================

  const { error: updateError } = await db
    .from("proyek_progress")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", progress.id)
    .is("id_jurnal", null);

  if (updateError) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi gagal menghubungkan progress: ${updateError.message}`,
    );
  }

  return idJurnal;
}
