import { db } from "@/lib/supabase/server";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";
import { postJournal } from "@/lib/accounting/postJournal";

import type { JurnalLine } from "@/types/accounting";

export type MetodePenerimaanProyek = "KAS" | "BANK";

export type ProyekPenerimaanInput = {
  id_tagihan: string;
  tanggal: string;
  jumlah: number;
  metode: MetodePenerimaanProyek;
  bank?: string | null;
};

export type PostProyekPenerimaanResult = {
  id: string;
  id_tagihan: string;
  id_jurnal: number;
};

type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export async function postProyekPenerimaan(
  data: ProyekPenerimaanInput,
): Promise<PostProyekPenerimaanResult> {
  // =====================================================
  // VALIDASI INPUT
  // =====================================================

  const jumlah = Number(data.jumlah);

  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    throw new Error("Jumlah penerimaan harus lebih besar dari 0.");
  }

  if (data.metode !== "KAS" && data.metode !== "BANK") {
    throw new Error("Metode penerimaan hanya KAS atau BANK.");
  }

  const namaBank = data.bank?.trim() ?? null;

  if (data.metode === "BANK" && !namaBank) {
    throw new Error("Bank wajib diisi untuk metode BANK.");
  }

  if (data.metode === "KAS" && namaBank) {
    throw new Error("Bank tidak boleh diisi untuk metode KAS.");
  }

  // =====================================================
  // AMBIL TAGIHAN
  // =====================================================

  const { data: tagihan, error: tagihanError } = await db
    .from("proyek_tagihan")
    .select(
      `
          id,
          id_proyek,
          grand_total,
          id_jurnal
        `,
    )
    .eq("id", data.id_tagihan)
    .single();

  if (tagihanError || !tagihan) {
    throw new Error("Tagihan proyek tidak ditemukan.");
  }

  // =====================================================
  // TAGIHAN HARUS SUDAH POSTED
  // =====================================================

  if (tagihan.id_jurnal === null) {
    throw new Error("Tagihan belum memiliki jurnal Posted.");
  }

  // =====================================================
  // AMBIL PIUTANG
  // =====================================================

  const { data: piutang, error: piutangError } = await db
    .from("piutang_proyek")
    .select(
      `
          id_piutang_proyek,
          id_proyek,
          id_tagihan,
          nilai_piutang,
          penerimaan,
          saldo,
          status
        `,
    )
    .eq("id_tagihan", data.id_tagihan)
    .single();

  if (piutangError || !piutang) {
    throw new Error("Piutang proyek untuk tagihan tersebut belum dibuat.");
  }

  // =====================================================
  // VALIDASI RELASI PROYEK
  // =====================================================

  if (piutang.id_proyek !== tagihan.id_proyek) {
    throw new Error("Piutang tidak sesuai dengan proyek tagihan.");
  }

  // =====================================================
  // VALIDASI NILAI PIUTANG
  // =====================================================

  const nilaiPiutang = Number(piutang.nilai_piutang);

  const penerimaanLama = Number(piutang.penerimaan);

  const saldoLama = Number(piutang.saldo);

  const grandTotal = Number(tagihan.grand_total);

  if (!Number.isFinite(nilaiPiutang) || nilaiPiutang <= 0) {
    throw new Error("Nilai piutang tidak valid.");
  }

  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error("Grand total tagihan tidak valid.");
  }

  if (nilaiPiutang !== grandTotal) {
    throw new Error("Nilai piutang tidak sama dengan grand total tagihan.");
  }

  if (!Number.isFinite(penerimaanLama) || penerimaanLama < 0) {
    throw new Error("Penerimaan sebelumnya tidak valid.");
  }

  if (!Number.isFinite(saldoLama) || saldoLama < 0) {
    throw new Error("Saldo piutang tidak valid.");
  }

  // =====================================================
  // ANTI MINUS
  // =====================================================

  if (jumlah > saldoLama) {
    throw new Error(
      `Penerimaan Rp ${jumlah.toLocaleString(
        "id-ID",
      )} melebihi saldo piutang Rp ${saldoLama.toLocaleString("id-ID")}.`,
    );
  }

  // =====================================================
  // HITUNG PENERIMAAN BARU
  // =====================================================

  const penerimaanBaru = penerimaanLama + jumlah;

  const saldoBaru = nilaiPiutang - penerimaanBaru;

  if (!Number.isFinite(penerimaanBaru) || penerimaanBaru < 0) {
    throw new Error("Total penerimaan tidak valid.");
  }

  if (!Number.isFinite(saldoBaru) || saldoBaru < 0) {
    throw new Error("Saldo piutang tidak boleh minus.");
  }

  // =====================================================
  // STATUS OTOMATIS
  // =====================================================

  let status: StatusPiutangProyek;

  if (saldoBaru === 0) {
    status = "Paid (Pembayaran Penuh/ Lunas)";
  } else if (penerimaanBaru > 0) {
    status = "Partial (Pembayaran Sebagian)";
  } else {
    status = "Unpaid (Menunggu Pembayaran)";
  }

  // =====================================================
  // COA PIUTANG
  // =====================================================

  const coaPiutang = await getCoaMappingDetail("PIUTANG_PROYEK", "PIUTANG");

  // =====================================================
  // COA KAS / BANK
  // =====================================================
  //
  // Mapping yang tersedia:
  //
  // PIUTANG_PROYEK / KAS   -> 871
  // PROYEK / KAS           -> 871
  // PROYEK / BANK          -> 170
  //
  // Untuk penerimaan proyek kita gunakan mapping PROYEK.
  // =====================================================

  const coaKasBank = await getCoaMappingDetail("PROYEK", data.metode);

  // =====================================================
  // JURNAL PENERIMAAN
  // =====================================================

  const lines: JurnalLine[] = [
    {
      id_coa: coaKasBank.id_coa,
      debit: jumlah,
      kredit: 0,
    },
    {
      id_coa: coaPiutang.id_coa,
      debit: 0,
      kredit: jumlah,
    },
  ];

  // =====================================================
  // VALIDASI BALANCE
  // =====================================================

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (totalDebit !== totalKredit) {
    throw new Error("Jurnal penerimaan piutang proyek tidak balance.");
  }

  // =====================================================
  // POST JURNAL
  // =====================================================

  const idJurnal = await postJournal({
    tanggal: data.tanggal,
    no_bukti: `RCV-${Date.now()}`,
    keterangan: `Penerimaan piutang proyek - ${data.id_tagihan}`,
    sumber: "PIUTANG_PROYEK",
    modul: "ACCOUNTING",
    id_proyek: piutang.id_proyek,
    lines,
  });

  // =====================================================
  // SIMPAN PENERIMAAN
  // =====================================================
  //
  // Sesuai database proyek_penerimaan:
  //
  // id
  // id_tagihan
  // tanggal
  // jumlah
  // metode
  // bank
  //
  // TIDAK ADA id_jurnal.
  // =====================================================

  const { data: penerimaan, error: penerimaanError } = await db
    .from("proyek_penerimaan")
    .insert({
      id_tagihan: data.id_tagihan,
      tanggal: data.tanggal,
      jumlah,
      metode: data.metode,
      bank: data.metode === "BANK" ? namaBank : null,
    })
    .select(
      `
        id,
        id_tagihan,
        tanggal,
        jumlah,
        metode,
        bank
      `,
    )
    .single();

  if (penerimaanError || !penerimaan) {
    throw new Error(
      penerimaanError?.message ?? "Gagal menyimpan penerimaan proyek.",
    );
  }

  // =====================================================
  // UPDATE PIUTANG
  // =====================================================

  const { error: updateError } = await db
    .from("piutang_proyek")
    .update({
      penerimaan: penerimaanBaru,
      tanggal_pembayaran: data.tanggal,
      status,
    })
    .eq("id_piutang_proyek", piutang.id_piutang_proyek);

  if (updateError) {
    throw new Error(
      `Penerimaan tersimpan tetapi piutang gagal diperbarui: ${updateError.message}`,
    );
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    id: penerimaan.id,
    id_tagihan: penerimaan.id_tagihan,
    id_jurnal: Number(idJurnal),
  };
}
