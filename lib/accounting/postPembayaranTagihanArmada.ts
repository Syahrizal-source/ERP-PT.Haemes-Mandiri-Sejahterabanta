import { db } from "@/lib/supabase/server";

import { postJournal } from "./postJournal";
import {
  getCoaHutangArmada,
  validateCoaPembayaranArmada,
} from "./getcoamapping";

import {
  armadaPembayaranTagihanSchema,
  normalizeArmadaPembayaranTagihan,
  validateArmadaPembayaranTagihan,
  type ArmadaPembayaranTagihanInput,
} from "@/lib/validators/tagihan-pembayaran-armada";

import type { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * POST PEMBAYARAN TAGIHAN ARMADA
 * ============================================================
 *
 * Flow accounting:
 *
 *     Dr Hutang Armada
 *     Cr Kas / Bank
 *
 * COA Hutang:
 *
 *     ARMADA / HUTANG
 *          ↓
 *     coa_mapping
 *          ↓
 *     id_coa 2570
 *          ↓
 *     21106 Hutang Armada
 *
 * COA pembayaran:
 *
 *     armada_pembayaran_tagihan.id_coa_kas
 *          ↓
 *     harus COA aktif
 *     harus is_cash = true
 *     harus is_header = false
 *
 * Tidak menggunakan:
 *
 *     ARMADA / KAS
 *          ↓
 *     865 Kas Armada
 *
 * karena 865 merupakan header.
 *
 * Tabel sumber:
 *
 *     public.armada_pembayaran_tagihan
 *
 * Setelah jurnal berhasil:
 *
 *     status   = POSTED
 *     id_jurnal = ID jurnal
 *
 * ============================================================
 */

export async function postPembayaranTagihanArmada(
  input: ArmadaPembayaranTagihanInput,
): Promise<number> {
  /**
   * ==========================================================
   * 1. NORMALIZE & VALIDATE INPUT
   * ==========================================================
   */

  const data = normalizeArmadaPembayaranTagihan(input);

  validateArmadaPembayaranTagihan(data);

  /**
   * ==========================================================
   * 2. VALIDASI ARMADA
   * ==========================================================
   *
   * Pastikan armada yang akan dibayar memang tersedia.
   */

  const { data: armada, error: armadaError } = await db
    .from("armada")
    .select(
      "id, tanggal, kode_transaksi, no_polisi, no_pintu, supir, jumlah_tagihan, status",
    )
    .eq("id", data.armada_id)
    .maybeSingle();

  if (armadaError) {
    throw new Error(`Gagal mengambil data Armada: ${armadaError.message}`);
  }

  if (!armada) {
    throw new Error(`Data Armada tidak ditemukan (id=${data.armada_id}).`);
  }

  /**
   * ==========================================================
   * 3. VALIDASI NILAI TAGIHAN ARMADA
   * ==========================================================
   */

  const jumlahTagihan = Number(armada.jumlah_tagihan);

  if (!Number.isFinite(jumlahTagihan) || jumlahTagihan < 0) {
    throw new Error(
      `Jumlah tagihan Armada tidak valid untuk Armada ${armada.kode_transaksi}.`,
    );
  }

  /**
   * ==========================================================
   * 4. CEK PEMBAYARAN SEBELUMNYA
   * ==========================================================
   *
   * Hanya pembayaran POSTED yang dianggap sebagai pembayaran
   * yang benar-benar mengurangi hutang.
   *
   * DRAFT tidak dihitung.
   * CANCELLED tidak dihitung.
   */

  const { data: pembayaranSebelumnya, error: pembayaranError } = await db
    .from("armada_pembayaran_tagihan")
    .select("id, nominal, status, id_jurnal, no_bukti")
    .eq("armada_id", data.armada_id)
    .eq("status", "POSTED");

  if (pembayaranError) {
    throw new Error(
      `Gagal mengambil pembayaran Armada sebelumnya: ${pembayaranError.message}`,
    );
  }

  const totalSudahDibayar = (pembayaranSebelumnya ?? []).reduce(
    (total, pembayaran) => total + Number(pembayaran.nominal),
    0,
  );

  if (!Number.isFinite(totalSudahDibayar)) {
    throw new Error("Total pembayaran Armada sebelumnya tidak valid.");
  }

  /**
   * ==========================================================
   * 5. HITUNG SISA TAGIHAN
   * ==========================================================
   */

  const sisaTagihan = Number((jumlahTagihan - totalSudahDibayar).toFixed(2));

  if (sisaTagihan <= 0) {
    throw new Error(`Tagihan Armada ${armada.kode_transaksi} sudah lunas.`);
  }

  /**
   * ==========================================================
   * 6. VALIDASI NOMINAL PEMBAYARAN
   * ==========================================================
   */

  const nominal = Number(data.nominal.toFixed(2));

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal pembayaran Armada tidak valid.");
  }

  if (nominal > sisaTagihan) {
    throw new Error(
      `Nominal pembayaran Rp${nominal.toLocaleString(
        "id-ID",
      )} melebihi sisa tagihan Armada Rp${sisaTagihan.toLocaleString(
        "id-ID",
      )}.`,
    );
  }

  /**
   * ==========================================================
   * 7. VALIDASI DUPLIKASI NO BUKTI
   * ==========================================================
   *
   * Tabel database juga mempunyai unique index pada no_bukti.
   * Kita lakukan pengecekan lebih awal agar error lebih jelas.
   */

  const { data: existingNoBukti, error: noBuktiError } = await db
    .from("armada_pembayaran_tagihan")
    .select("id, status, id_jurnal")
    .eq("no_bukti", data.no_bukti)
    .maybeSingle();

  if (noBuktiError) {
    throw new Error(
      `Gagal memeriksa nomor bukti pembayaran Armada: ${noBuktiError.message}`,
    );
  }

  if (existingNoBukti) {
    throw new Error(`No bukti pembayaran ${data.no_bukti} sudah digunakan.`);
  }

  /**
   * ==========================================================
   * 8. AMBIL COA HUTANG ARMADA
   * ==========================================================
   *
   * Sumber:
   *
   *     ARMADA / HUTANG
   *
   * Helper akan memeriksa mapping database.
   *
   * Mapping yang sudah kita buat:
   *
   *     id_coa 2570
   *     21106 Hutang Armada
   */

  const coaHutang = await getCoaHutangArmada();

  /**
   * ==========================================================
   * 9. VALIDASI COA PEMBAYARAN
   * ==========================================================
   *
   * id_coa_kas berasal dari:
   *
   *     armada_pembayaran_tagihan.id_coa_kas
   *
   * Syarat:
   *
   *     aktif      = true
   *     is_cash    = true
   *     is_header  = false
   *
   * Jadi header seperti 865 tidak dapat dipakai langsung.
   */

  if (data.id_coa_kas === null) {
    throw new Error("COA kas/bank pembayaran Armada wajib dipilih.");
  }

  const coaKas = await validateCoaPembayaranArmada(data.id_coa_kas);

  /**
   * ==========================================================
   * 10. PASTIKAN COA DEBIT DAN KREDIT BERBEDA
   * ==========================================================
   */

  if (coaHutang.id_coa === coaKas.id_coa) {
    throw new Error("COA Hutang Armada dan COA pembayaran tidak boleh sama.");
  }

  /**
   * ==========================================================
   * 11. BUILD JURNAL
   * ==========================================================
   *
   * Accounting:
   *
   *     Dr 2570 Hutang Armada
   *     Cr COA Kas/Bank Detail
   *
   * Tidak ada pendapatan.
   * Tidak ada beban baru.
   *
   * Karena beban sudah diakui pada transaksi tagihan,
   * pembayaran hanya mengurangi hutang dan kas/bank.
   */

  const lines: JurnalLine[] = [
    {
      id_coa: coaHutang.id_coa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_coa: coaKas.id_coa,
      debit: 0,
      kredit: nominal,
    },
  ];

  /**
   * ==========================================================
   * 12. VALIDASI DETAIL JURNAL
   * ==========================================================
   */

  if (lines.length !== 2) {
    throw new Error("Detail jurnal pembayaran Armada tidak lengkap.");
  }

  for (const line of lines) {
    if (!Number.isInteger(line.id_coa) || line.id_coa <= 0) {
      throw new Error("COA jurnal pembayaran Armada tidak valid.");
    }

    if (!Number.isFinite(line.debit) || line.debit < 0) {
      throw new Error("Nilai debit jurnal pembayaran Armada tidak valid.");
    }

    if (!Number.isFinite(line.kredit) || line.kredit < 0) {
      throw new Error("Nilai kredit jurnal pembayaran Armada tidak valid.");
    }

    if (line.debit > 0 && line.kredit > 0) {
      throw new Error(
        "Satu detail jurnal pembayaran Armada tidak boleh memiliki debit dan kredit sekaligus.",
      );
    }

    if (line.debit === 0 && line.kredit === 0) {
      throw new Error(
        "Detail jurnal pembayaran Armada tidak boleh bernilai nol.",
      );
    }
  }

  /**
   * ==========================================================
   * 13. VALIDASI BALANCE
   * ==========================================================
   */

  const totalDebit = Number(
    lines.reduce((sum, line) => sum + Number(line.debit), 0).toFixed(2),
  );

  const totalKredit = Number(
    lines.reduce((sum, line) => sum + Number(line.kredit), 0).toFixed(2),
  );

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Total debit atau kredit pembayaran Armada tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error(
      "Jurnal pembayaran Armada harus memiliki debit dan kredit lebih besar dari nol.",
    );
  }

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal pembayaran Armada tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  /**
   * ==========================================================
   * 14. POST JOURNAL
   * ==========================================================
   *
   * postJournal akan:
   *
   *     - validasi jurnal
   *     - mengambil periode OPEN
   *     - membuat jurnal header
   *     - membuat jurnal_detail
   *     - rollback header jika detail gagal
   */

  let jurnalId: number;

  try {
    jurnalId = await postJournal({
      tanggal: data.tanggal,

      no_bukti: data.no_bukti,

      keterangan:
        data.keterangan?.trim() ||
        `Pembayaran Tagihan Armada - ${armada.no_polisi} - ${armada.supir}`,

      sumber: "ARMADA",

      modul: "ARMADA",

      ref_id: data.armada_id.toString(),

      id_armada: data.armada_id,

      lines,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Gagal melakukan posting jurnal pembayaran Armada.",
    );
  }

  /**
   * ==========================================================
   * 15. SIMPAN PEMBAYARAN TAGIHAN ARMADA
   * ==========================================================
   *
   * Hanya dilakukan setelah jurnal berhasil.
   *
   * Status langsung POSTED karena jurnal sudah berhasil dibuat.
   */

  const { data: pembayaran, error: insertError } = await db
    .from("armada_pembayaran_tagihan")
    .insert({
      armada_id: data.armada_id,

      tanggal: data.tanggal,

      no_bukti: data.no_bukti,

      nominal,

      metode_pembayaran: data.metode_pembayaran,

      id_coa_kas: coaKas.id_coa,

      keterangan: data.keterangan?.trim() || null,

      status: "POSTED",

      id_jurnal: jurnalId,
    })
    .select(
      "id, armada_id, tanggal, no_bukti, nominal, metode_pembayaran, id_coa_kas, keterangan, status, id_jurnal",
    )
    .single();

  /**
   * ==========================================================
   * 16. JIKA INSERT PEMBAYARAN GAGAL
   * ==========================================================
   *
   * Karena postJournal sudah membuat jurnal, kita bersihkan
   * jurnal yang baru dibuat agar tidak meninggalkan transaksi
   * accounting tanpa record pembayaran.
   *
   * Penghapusan detail dilakukan terlebih dahulu karena
   * jurnal_detail memiliki FK ke jurnal.
   */

  if (insertError || !pembayaran) {
    console.error("INSERT PEMBAYARAN TAGIHAN ARMADA ERROR:", insertError);

    const { error: deleteDetailError } = await db
      .from("jurnal_detail")
      .delete()
      .eq("id_jurnal", jurnalId);

    if (deleteDetailError) {
      console.error("CLEANUP JURNAL DETAIL ERROR:", deleteDetailError);
    }

    const { error: deleteJurnalError } = await db
      .from("jurnal")
      .delete()
      .eq("id_jurnal", jurnalId);

    if (deleteJurnalError) {
      console.error("CLEANUP JURNAL ERROR:", deleteJurnalError);
    }

    throw new Error(
      `Gagal menyimpan pembayaran tagihan Armada: ${
        insertError?.message ?? "Data pembayaran tidak tersimpan."
      }`,
    );
  }

  /**
   * ==========================================================
   * 17. RETURN ID JURNAL
   * ==========================================================
   */

  return jurnalId;
}
