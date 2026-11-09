import { db } from "@/lib/supabase/server";
import { postJournal } from "./postJournal";
import { getCoaMappingDetail, type KategoriCoa } from "./getcoamapping";

import type { JurnalLine } from "@/types/accounting";

import {
  proyekOperasionalSchema,
  type ProyekOperasionalRequest,
} from "@/lib/validators/proyekOperasional";

// =====================================================
// REQUEST POSTING
// =====================================================

type PostOperasionalRequest = ProyekOperasionalRequest & {
  id_operasional: string;
};

// =====================================================
// POST OPERASIONAL PROYEK
// =====================================================

export async function postOperasional(
  data: PostOperasionalRequest,
): Promise<number> {
  // ===================================================
  // 1. VALIDASI REQUEST
  // ===================================================

  const payload = proyekOperasionalSchema.parse(data);

  if (!data.id_operasional) {
    throw new Error("ID operasional wajib diisi.");
  }

  // ===================================================
  // 2. AMBIL DATA OPERASIONAL
  // Jangan hanya percaya data dari request.
  // Data final harus berasal dari database.
  // ===================================================

  const { data: operasional, error: operasionalError } = await db
    .from("proyek_operasional")
    .select(
      `
        id,
        id_proyek,
        id_kategori,
        no_bukti,
        tanggal,
        uraian,
        qty,
        satuan,
        harga,
        total,
        supplier,
        metode_pembayaran,
        periode,
        status,
        keterangan,
        id_jurnal
      `,
    )
    .eq("id", data.id_operasional)
    .single();

  if (operasionalError || !operasional) {
    throw new Error("Data operasional proyek tidak ditemukan.");
  }

  // ===================================================
  // 3. CEGAH POSTING ULANG
  // ===================================================

  if (operasional.id_jurnal !== null) {
    throw new Error(
      `Operasional ${operasional.no_bukti} sudah diposting ke jurnal.`,
    );
  }

  // ===================================================
  // 4. VALIDASI PROYEK
  // ===================================================

  if (operasional.id_proyek !== payload.id_proyek) {
    throw new Error(
      "Data operasional tidak sesuai dengan proyek yang dipilih.",
    );
  }

  const { data: proyek, error: proyekError } = await db
    .from("proyek_master")
    .select("id, kode_proyek, nama_proyek, status")
    .eq("id", operasional.id_proyek)
    .single();

  if (proyekError || !proyek) {
    throw new Error("Proyek tidak ditemukan.");
  }

  if (proyek.status !== "OPEN" && proyek.status !== "BERJALAN") {
    throw new Error(
      `Status proyek ${proyek.status} tidak dapat menerima transaksi operasional.`,
    );
  }

  // ===================================================
  // 5. VALIDASI KATEGORI
  // ===================================================

  const { data: kategori, error: kategoriError } = await db
    .from("kategori_biaya_proyek")
    .select("id, kode, nama, jenis, aktif")
    .eq("id", operasional.id_kategori)
    .single();

  if (kategoriError || !kategori) {
    throw new Error("Kategori operasional tidak ditemukan.");
  }

  if (!kategori.aktif) {
    throw new Error(`Kategori operasional ${kategori.nama} sudah tidak aktif.`);
  }

  if (!kategori.kode) {
    throw new Error("Kode kategori operasional tidak ditemukan.");
  }

  // ===================================================
  // 6. COA OPERASIONAL
  //
  // TIDAK ADA HARD-CODE ID COA.
  //
  // Contoh:
  // kategori kode BBM       -> mapping PROYEK / BBM
  // kategori kode LISTRIK   -> mapping PROYEK / LISTRIK
  // kategori kode INTERNET  -> mapping PROYEK / INTERNET
  //
  // Sesuai coa_mapping database.
  // ===================================================

  const coaOperasional = await getCoaMappingDetail(
    "PROYEK",
    kategori.kode as KategoriCoa,
  );

  // ===================================================
  // 7. COA LAWAN
  //
  // KAS        -> PROYEK / KAS
  // KAS_BESAR  -> PROYEK / KAS_BESAR
  // KAS_KECIL  -> PROYEK / KAS_KECIL
  // BANK       -> PROYEK / BANK
  // HUTANG     -> PROYEK / HUTANG
  // ===================================================

  let kategoriCoa: KategoriCoa;

  switch (operasional.metode_pembayaran) {
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
      throw new Error("Metode pembayaran operasional tidak valid.");
  }

  const coaLawan = await getCoaMappingDetail("PROYEK", kategoriCoa);

  // ===================================================
  // 8. HITUNG TOTAL
  //
  // Database:
  // qty   >= 0
  // harga >= 0
  // total >= 0
  //
  // Untuk POSTING jurnal, total harus > 0.
  // ===================================================

  const qty = Number(operasional.qty);
  const harga = Number(operasional.harga);

  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error("Qty operasional tidak valid.");
  }

  if (!Number.isFinite(harga) || harga < 0) {
    throw new Error("Harga operasional tidak valid.");
  }

  const total = qty * harga;

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Total operasional harus lebih besar dari 0.");
  }

  // ===================================================
  // 9. VALIDASI TOTAL DATABASE
  // ===================================================

  const totalDatabase = Number(operasional.total);

  if (!Number.isFinite(totalDatabase) || totalDatabase < 0) {
    throw new Error("Total operasional pada database tidak valid.");
  }

  /*
   * Pastikan nilai total yang diposting konsisten
   * dengan qty × harga.
   */
  const selisih = Math.abs(totalDatabase - total);

  if (selisih > 0.01) {
    throw new Error("Total operasional tidak sesuai dengan Qty × Harga.");
  }

  // ===================================================
  // 10. JURNAL
  //
  // DEBIT  : COA BIAYA OPERASIONAL
  // KREDIT : KAS / KAS BESAR / KAS KECIL /
  //          BANK / HUTANG
  // ===================================================

  const lines: JurnalLine[] = [
    {
      id_coa: Number(coaOperasional.id_coa),
      debit: total,
      kredit: 0,
      id_proyek: operasional.id_proyek,
    },
    {
      id_coa: Number(coaLawan.id_coa),
      debit: 0,
      kredit: total,
      id_proyek: operasional.id_proyek,
    },
  ];

  // ===================================================
  // 11. VALIDASI JURNAL
  // ===================================================

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);

  const totalKredit = lines.reduce((sum, line) => sum + Number(line.kredit), 0);

  if (!Number.isFinite(totalDebit) || !Number.isFinite(totalKredit)) {
    throw new Error("Nilai debit/kredit jurnal tidak valid.");
  }

  if (totalDebit <= 0 || totalKredit <= 0) {
    throw new Error("Debit dan kredit jurnal harus lebih besar dari 0.");
  }

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal operasional tidak balance. Debit: ${totalDebit}, Kredit: ${totalKredit}.`,
    );
  }

  // ===================================================
  // 12. POST JURNAL
  // ===================================================

  const idJurnal = await postJournal({
    tanggal: operasional.tanggal,
    no_bukti: operasional.no_bukti,
    keterangan: `Operasional: ${operasional.uraian}`,
    sumber: "PROYEK",
    modul: "PROYEK",
    ref_id: operasional.id,
    id_proyek: operasional.id_proyek,
    lines,
  });

  // ===================================================
  // 13. UPDATE TRANSAKSI
  // ===================================================

  const { data: updated, error: updateError } = await db
    .from("proyek_operasional")
    .update({
      id_jurnal: idJurnal,
      status: "POSTED",
    })
    .eq("id", operasional.id)
    .is("id_jurnal", null)
    .select("id, id_jurnal, status")
    .single();

  if (updateError || !updated) {
    throw new Error(
      `Jurnal berhasil dibuat tetapi operasional gagal diperbarui: ${
        updateError?.message ?? "Data tidak ditemukan."
      }`,
    );
  }

  return idJurnal;
}
