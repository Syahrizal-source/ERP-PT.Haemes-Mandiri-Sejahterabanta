import { db } from "@/lib/supabase/server";

import {
  piutangProyekSchema,
  type PiutangProyekInput,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

type PostPiutangProyekResult = {
  id_piutang_proyek: number;
  id_tagihan: string;
  id_jurnal: number;
};

type StatusPiutangProyek =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

export async function postPiutangProyek(
  data: PiutangProyekInput,
): Promise<PostPiutangProyekResult> {
  // =====================================================
  // VALIDASI INPUT
  // =====================================================

  const payload = piutangProyekSchema.parse(data);

  validatePiutangProyek(payload);

  const nilaiPiutang = Number(payload.nilai_piutang);
  const penerimaan = Number(payload.penerimaan);

  if (!Number.isFinite(nilaiPiutang) || nilaiPiutang <= 0) {
    throw new Error("Nilai piutang harus lebih besar dari 0.");
  }

  if (!Number.isFinite(penerimaan) || penerimaan < 0) {
    throw new Error("Penerimaan piutang tidak valid.");
  }

  if (penerimaan > nilaiPiutang) {
    throw new Error("Penerimaan tidak boleh melebihi nilai piutang.");
  }

  // =====================================================
  // VALIDASI PROYEK
  // =====================================================

  const { data: proyek, error: proyekError } = await db
    .from("proyek_master")
    .select("id")
    .eq("id", payload.id_proyek)
    .single();

  if (proyekError || !proyek) {
    throw new Error("Proyek tidak ditemukan.");
  }

  // =====================================================
  // VALIDASI TAGIHAN PROYEK
  // =====================================================

  const { data: tagihan, error: tagihanError } = await db
    .from("proyek_tagihan")
    .select(
      `
        id,
        id_proyek,
        tanggal,
        grand_total,
        status,
        id_jurnal
      `,
    )
    .eq("id", payload.id_tagihan)
    .single();

  if (tagihanError || !tagihan) {
    throw new Error("Tagihan proyek tidak ditemukan.");
  }

  // =====================================================
  // TAGIHAN HARUS MILIK PROYEK YANG SAMA
  // =====================================================

  if (tagihan.id_proyek !== payload.id_proyek) {
    throw new Error("Tagihan tidak sesuai dengan proyek yang dipilih.");
  }

  // =====================================================
  // TAGIHAN HARUS SUDAH POSTED
  // =====================================================

  if (tagihan.id_jurnal === null) {
    throw new Error(
      "Tagihan belum memiliki jurnal Posted. Piutang belum dapat dibuat.",
    );
  }

  const idJurnalTagihan = Number(tagihan.id_jurnal);

  if (!Number.isInteger(idJurnalTagihan) || idJurnalTagihan <= 0) {
    throw new Error("ID jurnal tagihan tidak valid.");
  }

  // =====================================================
  // VALIDASI GRAND TOTAL TAGIHAN
  // =====================================================

  const grandTotal = Number(tagihan.grand_total);

  if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
    throw new Error("Grand total tagihan tidak valid.");
  }

  if (nilaiPiutang !== grandTotal) {
    throw new Error(
      `Nilai piutang (${nilaiPiutang}) harus sama dengan grand total tagihan (${grandTotal}).`,
    );
  }

  // =====================================================
  // VALIDASI JURNAL TAGIHAN
  // =====================================================

  const { data: jurnal, error: jurnalError } = await db
    .from("jurnal")
    .select(
      `
        id_jurnal,
        id_proyek,
        is_posted
      `,
    )
    .eq("id_jurnal", idJurnalTagihan)
    .single();

  if (jurnalError || !jurnal) {
    throw new Error("Jurnal tagihan tidak ditemukan.");
  }

  if (jurnal.is_posted !== true) {
    throw new Error("Jurnal tagihan belum berstatus Posted.");
  }

  if (jurnal.id_proyek !== null && jurnal.id_proyek !== payload.id_proyek) {
    throw new Error("Jurnal tagihan tidak sesuai dengan proyek.");
  }

  // =====================================================
  // CEGAH PIUTANG GANDA
  // =====================================================

  const { data: existing, error: existingError } = await db
    .from("piutang_proyek")
    .select("id_piutang_proyek")
    .eq("id_tagihan", payload.id_tagihan)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Gagal memeriksa piutang yang sudah ada: ${existingError.message}`,
    );
  }

  if (existing) {
    throw new Error("Piutang untuk tagihan tersebut sudah dibuat.");
  }

  // =====================================================
  // STATUS OTOMATIS
  // =====================================================

  let status: StatusPiutangProyek;

  if (penerimaan === 0) {
    status = "Unpaid (Menunggu Pembayaran)";
  } else if (penerimaan < nilaiPiutang) {
    status = "Partial (Pembayaran Sebagian)";
  } else {
    status = "Paid (Pembayaran Penuh/ Lunas)";
  }

  // =====================================================
  // INSERT PIUTANG
  // =====================================================
  //
  // saldo TIDAK DIISI.
  // Database menghitung:
  //
  // saldo = nilai_piutang - penerimaan
  //
  // Piutang menggunakan jurnal tagihan yang sudah POSTED.
  // Fungsi ini TIDAK membuat jurnal baru.
  //

  const { data: piutang, error: piutangError } = await db
    .from("piutang_proyek")
    .insert({
      id_proyek: payload.id_proyek,
      id_tagihan: payload.id_tagihan,
      tanggal: payload.tanggal,
      customer: payload.customer.trim(),
      tanggal_pembayaran: payload.tanggal_pembayaran ?? null,
      nilai_piutang: nilaiPiutang,
      penerimaan,
      keterangan: payload.keterangan?.trim() || null,
      status,
      is_posted: true,
      id_jurnal: idJurnalTagihan,
    })
    .select(
      `
        id_piutang_proyek,
        id_tagihan,
        id_jurnal
      `,
    )
    .single();

  if (piutangError || !piutang) {
    throw new Error(piutangError?.message ?? "Gagal menyimpan piutang proyek.");
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    id_piutang_proyek: Number(piutang.id_piutang_proyek),
    id_tagihan: piutang.id_tagihan,
    id_jurnal: Number(piutang.id_jurnal),
  };
}
