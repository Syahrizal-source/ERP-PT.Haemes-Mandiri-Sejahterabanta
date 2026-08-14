import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

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

  proyekProgressSchema.parse(data);

  // =====================================================
  // CEK DATA PROGRESS
  // =====================================================

  const { data: progress, error: progressError } = await db
    .from("proyek_progress")
    .select(
      `
      id,
      id_proyek,
      no_bukti,
      tanggal,
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

  if (progress.id_proyek !== data.id_proyek) {
    throw new Error("Progress tidak sesuai dengan proyek yang dipilih.");
  }

  // =====================================================
  // CEGAH POSTING ULANG
  // =====================================================

  if (progress.id_jurnal !== null) {
    throw new Error(`Progress ${progress.no_bukti} sudah diposting ke jurnal.`);
  }

  // =====================================================
  // TOTAL PROGRESS
  // =====================================================

  const total = Number(progress.nilai_progress);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Nilai progress harus lebih besar dari 0.");
  }

  // =====================================================
  // COA WIP
  // =====================================================

  const coaWip = await getCoaMappingDetail("PROYEK", "WIP");

  // =====================================================
  // COA LAWAN
  // =====================================================

  const kategoriCoa =
    progress.metode_pembayaran === "KAS"
      ? "KAS"
      : progress.metode_pembayaran === "BANK"
        ? "BANK"
        : "HUTANG";

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  // =====================================================
  // JURNAL PROGRESS
  //
  // DEBIT  : WIP
  // KREDIT : KAS / BANK / HUTANG
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

  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal progress tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  // =====================================================
  // POSTING JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: progress.tanggal,
    no_bukti: progress.no_bukti,
    keterangan: `Progress : ${progress.keterangan ?? "-"}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: progress.id,
    id_proyek: progress.id_proyek,
    lines,
  });

  // =====================================================
  // SIMPAN ID JURNAL KE PROGRESS
  // =====================================================

  const { error: updateError } = await db
    .from("proyek_progress")
    .update({
      id_jurnal: idJurnal,
    })
    .eq("id", progress.id);

  if (updateError) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi gagal menghubungkan progress: ${updateError.message}`,
    );
  }

  return idJurnal;
}
