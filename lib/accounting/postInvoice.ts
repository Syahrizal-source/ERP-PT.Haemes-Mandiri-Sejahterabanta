import { postJournal } from "./postJournal";
import { getCoaMappingDetail } from "./getcoamapping";

import { db } from "@/lib/supabase/server";

import type { JurnalLine } from "@/types/accounting";

/**
 * ============================================================
 * ROW PROYEK + VENDOR
 * ============================================================
 *
 * Invoice Proyek tidak menerima customer/vendor dari frontend.
 *
 * Source of truth:
 *
 *   invoice.id_proyek
 *        ↓
 *   proyek_master.id
 *        ↓
 *   proyek_master.id_vendor
 *        ↓
 *   vendors.id
 *
 * COA vendor TIDAK digunakan untuk posting invoice proyek.
 */
interface InvoiceProjectRow {
  id: string;
  kode_proyek: string;
  nama_proyek: string;
  nilai_kontrak: number;
  id_vendor: number | null;
  vendor: InvoiceVendorRow | null;
}

interface InvoiceVendorRow {
  id: number;
  kode_vendor: string;
  nama_vendor: string;
  status: boolean;
}

/**
 * ============================================================
 * POST INVOICE PROYEK
 * ============================================================
 *
 * Flow:
 *
 *   id_proyek
 *      ↓
 *   proyek_master
 *      ↓
 *   id_vendor
 *      ↓
 *   vendors
 *
 * Accounting:
 *
 *   Debit  : COA mapping INVOICE / PIUTANG
 *   Kredit : COA mapping INVOICE / PENDAPATAN
 *
 * COA tidak di-hardcode.
 *
 * Vendor.id_coa juga TIDAK digunakan.
 */
export async function postInvoice(
  tanggal: string,
  no_bukti: string,
  keterangan: string,
  nominal: number,
  id_proyek: string,
): Promise<number> {
  /**
   * ==========================================================
   * VALIDASI INPUT DASAR
   * ==========================================================
   */

  if (!tanggal.trim()) {
    throw new Error("Tanggal invoice wajib diisi.");
  }

  if (!no_bukti.trim()) {
    throw new Error("Nomor invoice wajib diisi.");
  }

  if (!id_proyek.trim()) {
    throw new Error("Proyek invoice wajib dipilih.");
  }

  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error("Nominal invoice tidak valid.");
  }

  /**
   * ==========================================================
   * AMBIL PROYEK + VENDOR
   * ==========================================================
   *
   * Customer tidak boleh dipercaya dari frontend.
   *
   * Customer invoice berasal dari:
   *
   *   vendors.nama_vendor
   *
   * melalui:
   *
   *   proyek_master.id_vendor
   */

  const { data: project, error: projectError } = await db
    .from("proyek_master")
    .select(
      `
      id,
      kode_proyek,
      nama_proyek,
      nilai_kontrak,
      id_vendor,
      vendor:vendors!proyek_master_id_vendor_fkey(
        id,
        kode_vendor,
        nama_vendor,
        status
      )
      `,
    )
    .eq("id", id_proyek)
    .maybeSingle<InvoiceProjectRow>();

  if (projectError) {
    throw new Error(`Gagal mengambil proyek invoice: ${projectError.message}`);
  }

  if (!project) {
    throw new Error(`Proyek dengan id ${id_proyek} tidak ditemukan.`);
  }

  /**
   * ==========================================================
   * VALIDASI VENDOR
   * ==========================================================
   *
   * Invoice proyek harus mempunyai vendor/customer
   * yang berasal dari master vendors.
   */

  if (!project.id_vendor) {
    throw new Error(
      `Proyek ${project.kode_proyek} belum memiliki Customer/Vendor.`,
    );
  }

  if (!project.vendor) {
    throw new Error(
      `Customer/Vendor untuk proyek ${project.kode_proyek} tidak ditemukan.`,
    );
  }

  if (!project.vendor.status) {
    throw new Error(
      `Customer/Vendor ${project.vendor.nama_vendor} sudah tidak aktif.`,
    );
  }

  const namaVendor: string = project.vendor.nama_vendor.trim();

  if (!namaVendor) {
    throw new Error(
      `Nama Customer/Vendor untuk proyek ${project.kode_proyek} tidak valid.`,
    );
  }

  /**
   * ==========================================================
   * VALIDASI NILAI KONTRAK
   * ==========================================================
   *
   * Nilai kontrak diambil dari proyek.
   *
   * Tidak mengambil nilai kontrak dari frontend.
   */

  const nilaiKontrak: number = Number(project.nilai_kontrak);

  if (!Number.isFinite(nilaiKontrak) || nilaiKontrak <= 0) {
    throw new Error(`Nilai kontrak proyek ${project.kode_proyek} tidak valid.`);
  }

  /**
   * ==========================================================
   * VALIDASI NOMINAL INVOICE TERHADAP KONTRAK
   * ==========================================================
   *
   * Invoice tidak boleh mempunyai nilai negatif / nol.
   *
   * Nominal invoice berasal dari hasil kalkulasi invoice.
   *
   * Guard ini juga mencegah invoice melebihi nilai kontrak.
   */

  if (nominal > nilaiKontrak) {
    throw new Error(
      `Nominal invoice ${nominal.toLocaleString("id-ID")} ` +
        `melebihi nilai kontrak proyek ${project.kode_proyek} ` +
        `sebesar ${nilaiKontrak.toLocaleString("id-ID")}.`,
    );
  }

  /**
   * ==========================================================
   * COA MAPPING INVOICE
   * ==========================================================
   *
   * Source of truth:
   *
   *   public.coa_mapping
   *
   * Tidak menggunakan:
   *
   *   - vendors.id_coa
   *   - hardcode id_coa
   *   - hardcode kode COA
   *
   * Mapping:
   *
   *   INVOICE / PIUTANG
   *   INVOICE / PENDAPATAN
   */

  const piutang = await getCoaMappingDetail("INVOICE", "PIUTANG");

  const pendapatan = await getCoaMappingDetail("INVOICE", "PENDAPATAN");

  /**
   * ==========================================================
   * VALIDASI COA MAPPING
   * ==========================================================
   */

  if (!Number.isInteger(piutang.id_coa) || piutang.id_coa <= 0) {
    throw new Error("COA mapping INVOICE / PIUTANG tidak valid.");
  }

  if (!Number.isInteger(pendapatan.id_coa) || pendapatan.id_coa <= 0) {
    throw new Error("COA mapping INVOICE / PENDAPATAN tidak valid.");
  }

  if (piutang.id_coa === pendapatan.id_coa) {
    throw new Error(
      "COA INVOICE / PIUTANG dan INVOICE / PENDAPATAN tidak boleh sama.",
    );
  }

  /**
   * ==========================================================
   * JURNAL INVOICE
   * ==========================================================
   *
   * Customer:
   *
   *   project.vendor.nama_vendor
   *
   * Proyek:
   *
   *   id_proyek
   *
   * Vendor:
   *
   *   project.id_vendor
   *
   * COA:
   *
   *   public.coa_mapping
   */

  const lines: JurnalLine[] = [
    {
      id_coa: piutang.id_coa,
      debit: nominal,
      kredit: 0,
      id_vendor: project.id_vendor,
      id_proyek: project.id,
    },
    {
      id_coa: pendapatan.id_coa,
      debit: 0,
      kredit: nominal,
      id_vendor: project.id_vendor,
      id_proyek: project.id,
    },
  ];

  /**
   * ==========================================================
   * VALIDASI BALANCE
   * ==========================================================
   */

  const totalDebit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.debit,
    0,
  );

  const totalKredit: number = lines.reduce(
    (sum: number, line: JurnalLine): number => sum + line.kredit,
    0,
  );

  const selisih: number = Math.abs(totalDebit - totalKredit);

  if (selisih > 0.01) {
    throw new Error(
      `Jurnal invoice tidak balance. ` +
        `Debit: ${totalDebit}, ` +
        `Kredit: ${totalKredit}, ` +
        `Selisih: ${selisih}.`,
    );
  }

  /**
   * ==========================================================
   * POST JURNAL
   * ==========================================================
   *
   * sumber/modul mengikuti transaksi Invoice.
   *
   * ref_id menggunakan id proyek supaya jurnal dapat
   * ditelusuri kembali ke proyek.
   */

  return postJournal({
    tanggal,
    no_bukti,
    keterangan:
      keterangan.trim() ||
      `Invoice ${no_bukti} - ${project.kode_proyek} - ${project.nama_proyek} - ${namaVendor}`,
    sumber: "PENDAPATAN",
    modul: "PENDAPATAN",
    ref_id: project.id,
    id_proyek: project.id,
    lines,
  });
}
