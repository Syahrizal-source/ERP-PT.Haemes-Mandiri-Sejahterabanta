import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pembayaranInvoiceSchema,
  type PembayaranInvoiceInput,
} from "@/lib/validators/pembayaran-invoice";

import { postPembayaranInvoice } from "@/lib/accounting/postPembayaranInvoice";

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface PembayaranInvoiceRow {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_coa_debit: number | null;
  id_jurnal: number | null;
  created_at: string;
}

interface InvoiceSaldoRow {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  status: string;
  tanggal_jatuh_tempo: string | null;
  id_proyek: string | null;

  nilai_kontrak: number | null;
  persentase_termin: number | null;
  nilai_tagihan_termin: number | null;
  potongan_uang_muka: number;
  retensi_persen: number | null;
  potongan_retensi: number;
  subtotal_tagihan: number | null;
  ppn_persen: number | null;
  ppn_nilai: number | null;
  total_neto: number | null;

  total_dibayar: number;
  sisa_tagihan: number;
  jumlah_pembayaran: number;
  nilai_tagihan: number;
}

interface CoaPembayaranRow {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

/**
 * ============================================================
 * STATUS PEMBAYARAN
 * ============================================================
 */

type PembayaranStatus = "UNPAID" | "PARTIAL" | "PAID";

/**
 * ============================================================
 * HITUNG STATUS INVOICE
 * ============================================================
 *
 * Status dihitung berdasarkan:
 *
 *   nilai_tagihan invoice
 *   +
 *   total pembayaran aktual
 *
 * Tidak menggunakan status lama invoice sebagai sumber
 * kebenaran saldo.
 */

function getPembayaranStatus(
  nilaiInvoice: number,
  totalBayar: number,
): PembayaranStatus {
  if (nilaiInvoice <= 0) {
    return "UNPAID";
  }

  if (totalBayar >= nilaiInvoice) {
    return "PAID";
  }

  if (totalBayar > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
}

/**
 * ============================================================
 * STATUS DESCRIPTION
 * ============================================================
 */

function getKeteranganStatus(status: PembayaranStatus): string {
  if (status === "PAID") {
    return "Pembayaran Lunas";
  }

  if (status === "PARTIAL") {
    return "Pembayaran Sebagian";
  }

  return "Belum Dibayar";
}

/**
 * ============================================================
 * HITUNG TOTAL PEMBAYARAN INVOICE
 * ============================================================
 *
 * Sumber:
 *
 *   public.pembayaran_invoice
 *
 * Yang dihitung adalah kolom total.
 */

async function getTotalPembayaranInvoice(idInvoice: number): Promise<number> {
  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("total")
    .eq("id_invoice", idInvoice);

  if (error) {
    throw new Error(`Gagal mengambil pembayaran invoice: ${error.message}`);
  }

  return (data ?? []).reduce(
    (sum: number, item: { total: number | null }): number =>
      sum + Number(item.total ?? 0),
    0,
  );
}

/**
 * ============================================================
 * AMBIL SALDO INVOICE
 * ============================================================
 *
 * Sumber utama:
 *
 *   public.v_invoice_saldo
 *
 * Ini penting karena:
 *
 * Invoice baru:
 *   total_neto
 *
 * Invoice lama:
 *   nominal
 *
 * View sudah menangani keduanya melalui:
 *
 *   nilai_tagihan
 *   total_dibayar
 *   sisa_tagihan
 */

async function getInvoiceSaldo(
  idInvoice: number,
): Promise<InvoiceSaldoRow | null> {
  const { data, error } = await db
    .from("v_invoice_saldo")
    .select(
      `
        id,
        tanggal,
        no_invoice,
        customer,
        status,
        tanggal_jatuh_tempo,
        id_proyek,
        nilai_kontrak,
        persentase_termin,
        nilai_tagihan_termin,
        potongan_uang_muka,
        retensi_persen,
        potongan_retensi,
        subtotal_tagihan,
        ppn_persen,
        ppn_nilai,
        total_neto,
        total_dibayar,
        sisa_tagihan,
        jumlah_pembayaran,
        nilai_tagihan
      `,
    )
    .eq("id", idInvoice)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil saldo invoice: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    tanggal: String(data.tanggal),
    no_invoice: String(data.no_invoice),
    customer: String(data.customer ?? ""),
    status: String(data.status ?? ""),
    tanggal_jatuh_tempo:
      data.tanggal_jatuh_tempo === null
        ? null
        : String(data.tanggal_jatuh_tempo),
    id_proyek: data.id_proyek === null ? null : String(data.id_proyek),

    nilai_kontrak:
      data.nilai_kontrak === null ? null : Number(data.nilai_kontrak),

    persentase_termin:
      data.persentase_termin === null ? null : Number(data.persentase_termin),

    nilai_tagihan_termin:
      data.nilai_tagihan_termin === null
        ? null
        : Number(data.nilai_tagihan_termin),

    potongan_uang_muka: Number(data.potongan_uang_muka ?? 0),

    retensi_persen:
      data.retensi_persen === null ? null : Number(data.retensi_persen),

    potongan_retensi: Number(data.potongan_retensi ?? 0),

    subtotal_tagihan:
      data.subtotal_tagihan === null ? null : Number(data.subtotal_tagihan),

    ppn_persen: data.ppn_persen === null ? null : Number(data.ppn_persen),

    ppn_nilai: data.ppn_nilai === null ? null : Number(data.ppn_nilai),

    total_neto: data.total_neto === null ? null : Number(data.total_neto),

    total_dibayar: Number(data.total_dibayar ?? 0),
    sisa_tagihan: Number(data.sisa_tagihan ?? 0),
    jumlah_pembayaran: Number(data.jumlah_pembayaran ?? 0),
    nilai_tagihan: Number(data.nilai_tagihan ?? 0),
  };
}

/**
 * ============================================================
 * UPDATE STATUS INVOICE
 * ============================================================
 *
 * Status database mengikuti saldo aktual.
 */

async function updateStatusInvoice(idInvoice: number): Promise<void> {
  const invoice = await getInvoiceSaldo(idInvoice);

  if (!invoice) {
    throw new Error(`Invoice ${idInvoice} tidak ditemukan saat update status.`);
  }

  const nilaiInvoice: number = invoice.nilai_tagihan;

  if (!Number.isFinite(nilaiInvoice) || nilaiInvoice <= 0) {
    throw new Error("Nilai tagihan invoice tidak valid saat update status.");
  }

  /**
   * Ambil ulang pembayaran dari tabel sebagai sumber
   * transaksi aktual.
   */
  const totalBayar: number = await getTotalPembayaranInvoice(idInvoice);

  const status: PembayaranStatus = getPembayaranStatus(
    nilaiInvoice,
    totalBayar,
  );

  let statusInvoice:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";

  if (status === "PAID") {
    statusInvoice = "Paid (Pembayaran Penuh/ Lunas)";
  } else if (status === "PARTIAL") {
    statusInvoice = "Partial (Pembayaran Sebagian)";
  } else {
    statusInvoice = "Unpaid (Menunggu Pembayaran)";
  }

  const { error } = await db
    .from("invoice")
    .update({
      status: statusInvoice,
    })
    .eq("id", idInvoice);

  if (error) {
    throw new Error(`Gagal memperbarui status invoice: ${error.message}`);
  }
}

/**
 * ============================================================
 * VALIDASI COA DEBIT PEMBAYARAN
 * ============================================================
 *
 * id_coa_debit berasal dari:
 *
 *   pembayaran_invoice.id_coa_debit
 *
 * Bukan dari:
 *
 *   rekening_bank.id
 *
 * Backend tetap wajib memvalidasi COA.
 *
 * Syarat:
 *
 *   aktif       = true
 *   is_cash     = true
 *   is_header   = false
 *   tipe        = ASET
 *
 * Dengan demikian COA HEADER atau akun BEBAN/LIABILITAS
 * tidak dapat digunakan sebagai rekening penerimaan.
 */

async function getValidCoaPembayaran(
  idCoaDebit: number,
): Promise<CoaPembayaranRow> {
  const { data, error } = await db
    .from("coa")
    .select(
      `
        id_coa,
        kode,
        nama,
        tipe,
        aktif,
        is_cash,
        is_header
      `,
    )
    .eq("id_coa", idCoaDebit)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memvalidasi COA pembayaran: ${error.message}`);
  }

  if (!data) {
    throw new Error("COA pembayaran tidak ditemukan.");
  }

  const coa: CoaPembayaranRow = {
    id_coa: Number(data.id_coa),
    kode: String(data.kode),
    nama: String(data.nama),
    tipe: String(data.tipe),
    aktif: Boolean(data.aktif),
    is_cash: Boolean(data.is_cash),
    is_header: Boolean(data.is_header),
  };

  if (!coa.aktif) {
    throw new Error(`COA ${coa.kode} - ${coa.nama} tidak aktif.`);
  }

  if (!coa.is_cash) {
    throw new Error(`COA ${coa.kode} - ${coa.nama} bukan akun Kas/Bank.`);
  }

  if (coa.is_header) {
    throw new Error(
      `COA ${coa.kode} - ${coa.nama} adalah COA header dan tidak boleh digunakan sebagai jurnal detail.`,
    );
  }

  if (coa.tipe !== "ASET") {
    throw new Error(`COA ${coa.kode} - ${coa.nama} bukan akun ASET.`);
  }

  return coa;
}

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Menampilkan daftar pembayaran invoice.
 *
 * Termasuk:
 *
 *   - COA debit
 *   - Invoice
 *   - status berdasarkan saldo aktual
 *
 * PPN dan PPh23 tetap dikembalikan karena kolom masih ada
 * pada database, tetapi untuk flow pembayaran invoice ini
 * nilainya 0.
 */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pembayaran_invoice")
      .select(
        `
          id,
          tanggal,
          id_invoice,
          nominal,
          ppn,
          pph23,
          total,
          keterangan,
          id_coa_debit,
          id_jurnal,
          created_at
        `,
      )
      .order("tanggal", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const rows: PembayaranInvoiceRow[] = (data ?? []).map(
      (item): PembayaranInvoiceRow => ({
        id: Number(item.id),
        tanggal: String(item.tanggal),
        id_invoice: Number(item.id_invoice),
        nominal: Number(item.nominal ?? 0),
        ppn: Number(item.ppn ?? 0),
        pph23: Number(item.pph23 ?? 0),
        total: Number(item.total ?? 0),
        keterangan: String(item.keterangan ?? ""),
        id_coa_debit:
          item.id_coa_debit === null ? null : Number(item.id_coa_debit),
        id_jurnal: item.id_jurnal === null ? null : Number(item.id_jurnal),
        created_at: String(item.created_at ?? ""),
      }),
    );

    const result = await Promise.all(
      rows.map(async (item: PembayaranInvoiceRow) => {
        const invoice = await getInvoiceSaldo(item.id_invoice);

        if (!invoice) {
          return {
            ...item,
            status: "UNPAID" as PembayaranStatus,
            keterangan_status: "Invoice tidak ditemukan",
            invoice: null,
            coa_debit: null,
          };
        }

        const totalBayar = invoice.total_dibayar;

        const status = getPembayaranStatus(invoice.nilai_tagihan, totalBayar);

        let coaDebit: {
          id_coa: number;
          kode: string;
          nama: string;
        } | null = null;

        if (item.id_coa_debit !== null) {
          const { data: coaData } = await db
            .from("coa")
            .select(
              `
                  id_coa,
                  kode,
                  nama
                `,
            )
            .eq("id_coa", item.id_coa_debit)
            .maybeSingle();

          if (coaData) {
            coaDebit = {
              id_coa: Number(coaData.id_coa),
              kode: String(coaData.kode),
              nama: String(coaData.nama),
            };
          }
        }

        return {
          ...item,
          status,
          keterangan_status: getKeteranganStatus(status),

          invoice: {
            id: invoice.id,
            no_invoice: invoice.no_invoice,
            customer: invoice.customer,
            id_proyek: invoice.id_proyek,
            nilai_tagihan: invoice.nilai_tagihan,
            total_dibayar: invoice.total_dibayar,
            sisa_tagihan: invoice.sisa_tagihan,
          },

          coa_debit: coaDebit,
        };
      }),
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PEMBAYARAN INVOICE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil pembayaran invoice",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Pembayaran Invoice TANPA PAJAK.
 *
 * Database:
 *
 *   pembayaran_invoice
 *      id_invoice
 *      nominal
 *      ppn
 *      pph23
 *      total
 *      id_coa_debit
 *      id_jurnal
 *
 * Jurnal:
 *
 *   DEBIT
 *       COA Bank/Kas DETAIL
 *
 *   KREDIT
 *       COA Piutang
 *       dari:
 *
 *       PEMBAYARAN_INVOICE / PIUTANG
 *
 * Tidak menggunakan:
 *
 *   - COA Pendapatan
 *   - COA Beban
 *   - COA Pajak
 *   - COA Hutang
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /**
     * ========================================================
     * PARSE REQUEST
     * ========================================================
     */

    const body: unknown = await req.json();

    const parsed = pembayaranInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran invoice tidak valid",
          details: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input: PembayaranInvoiceInput = parsed.data;

    const nominal: number = Number(input.nominal);

    /**
     * ========================================================
     * VALIDASI NOMINAL
     * ========================================================
     */

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran harus lebih besar dari 0",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * VALIDASI COA DEBIT
     * ========================================================
     *
     * Database sekarang menggunakan:
     *
     *   pembayaran_invoice.id_coa_debit
     *
     * Tidak menggunakan:
     *
     *   id_rekening
     *   rekening_bank.id_coa
     */

    const coaDebit = await getValidCoaPembayaran(input.id_coa_debit);

    /**
     * ========================================================
     * VALIDASI INVOICE + SALDO
     * ========================================================
     *
     * Gunakan v_invoice_saldo sebagai sumber nilai tagihan.
     *
     * Ini penting karena:
     *
     *   Invoice baru
     *      -> total_neto
     *
     *   Invoice lama
     *      -> nominal
     *
     * View sudah menyediakan:
     *
     *   nilai_tagihan
     *   total_dibayar
     *   sisa_tagihan
     */

    const invoice = await getInvoiceSaldo(input.id_invoice);

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice tidak ditemukan.",
        },
        {
          status: 400,
        },
      );
    }

    const nilaiInvoice: number = Number(invoice.nilai_tagihan);

    const totalPembayaranSebelumnya: number = await getTotalPembayaranInvoice(
      input.id_invoice,
    );

    const sisaInvoice: number = Math.max(
      nilaiInvoice - totalPembayaranSebelumnya,
      0,
    );

    /**
     * ========================================================
     * VALIDASI NILAI INVOICE
     * ========================================================
     */

    if (!Number.isFinite(nilaiInvoice) || nilaiInvoice <= 0) {
      return NextResponse.json(
        {
          error: "Nilai tagihan invoice tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * CEK SUDAH LUNAS
     * ========================================================
     */

    if (sisaInvoice <= 0) {
      return NextResponse.json(
        {
          error: "Invoice sudah lunas dan tidak dapat dibayar lagi.",
          nilai_tagihan: nilaiInvoice,
          total_dibayar: totalPembayaranSebelumnya,
          sisa_tagihan: 0,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * CEK OVERPAYMENT
     * ========================================================
     */

    if (nominal > sisaInvoice) {
      return NextResponse.json(
        {
          error: "Nominal pembayaran melebihi sisa invoice.",
          nilai_tagihan: nilaiInvoice,
          total_pembayaran_sebelumnya: totalPembayaranSebelumnya,
          sisa_tagihan: sisaInvoice,
          nominal_pembayaran: nominal,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ========================================================
     * TOTAL PEMBAYARAN
     * ========================================================
     *
     * Flow pembayaran invoice saat ini TANPA pajak.
     *
     * Oleh karena itu:
     *
     *   ppn   = 0
     *   pph23 = 0
     *   total = nominal
     */

    const ppn: number = 0;
    const pph23: number = 0;
    const totalBayar: number = nominal;

    /**
     * ========================================================
     * SIMPAN PEMBAYARAN
     * ========================================================
     *
     * id_coa_debit disimpan langsung sesuai database baru.
     */

    const { data, error } = await db
      .from("pembayaran_invoice")
      .insert({
        tanggal: input.tanggal,
        id_invoice: input.id_invoice,
        nominal,
        ppn,
        pph23,
        total: totalBayar,
        keterangan: input.keterangan,
        id_coa_debit: coaDebit.id_coa,
      })
      .select(
        `
          id,
          tanggal,
          id_invoice,
          nominal,
          ppn,
          pph23,
          total,
          keterangan,
          id_coa_debit,
          id_jurnal,
          created_at
        `,
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyimpan pembayaran invoice");
    }

    /**
     * ========================================================
     * POST JURNAL
     * ========================================================
     *
     * Jurnal:
     *
     *   DEBIT
     *       COA Bank/Kas DETAIL
     *       = coaDebit.id_coa
     *
     *   KREDIT
     *       COA Piutang
     *       = mapping:
     *
     *       PEMBAYARAN_INVOICE / PIUTANG
     *
     * Fungsi postPembayaranInvoice TIDAK menerima
     * id_rekening.
     */

    let jurnalId: number;

    try {
      jurnalId = await postPembayaranInvoice(
        input.tanggal,
        `PBY-${data.id}`,
        input.keterangan,
        totalBayar,
        coaDebit.id_coa,
      );
    } catch (journalError: unknown) {
      /**
       * Jika jurnal gagal, hapus pembayaran yang
       * baru dibuat.
       */
      await db.from("pembayaran_invoice").delete().eq("id", data.id);

      throw journalError;
    }

    /**
     * ========================================================
     * SIMPAN ID JURNAL
     * ========================================================
     */

    const { error: jurnalLinkError } = await db
      .from("pembayaran_invoice")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", data.id);

    if (jurnalLinkError) {
      throw new Error(
        "Jurnal berhasil dibuat tetapi gagal " +
          "menghubungkan id_jurnal ke pembayaran invoice: " +
          jurnalLinkError.message,
      );
    }

    /**
     * ========================================================
     * UPDATE STATUS INVOICE
     * ========================================================
     */

    await updateStatusInvoice(input.id_invoice);

    /**
     * ========================================================
     * AMBIL SALDO TERBARU
     * ========================================================
     */

    const saldoTerbaru = await getInvoiceSaldo(input.id_invoice);

    /**
     * ========================================================
     * RESPONSE
     * ========================================================
     */

    return NextResponse.json(
      {
        message: "Pembayaran invoice berhasil",

        data: {
          id: Number(data.id),
          tanggal: String(data.tanggal),
          id_invoice: Number(data.id_invoice),

          nominal: Number(data.nominal ?? 0),

          ppn: 0,
          pph23: 0,

          total: Number(data.total ?? 0),

          keterangan: String(data.keterangan ?? ""),

          id_coa_debit: Number(data.id_coa_debit),

          coa_debit: {
            id_coa: coaDebit.id_coa,
            kode: coaDebit.kode,
            nama: coaDebit.nama,
          },

          id_jurnal: jurnalId,

          saldo: saldoTerbaru
            ? {
                nilai_tagihan: saldoTerbaru.nilai_tagihan,

                total_dibayar: saldoTerbaru.total_dibayar,

                sisa_tagihan: saldoTerbaru.sisa_tagihan,

                jumlah_pembayaran: saldoTerbaru.jumlah_pembayaran,
              }
            : null,

          status: saldoTerbaru
            ? getPembayaranStatus(
                saldoTerbaru.nilai_tagihan,
                saldoTerbaru.total_dibayar,
              )
            : null,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PEMBAYARAN INVOICE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memproses pembayaran invoice",
      },
      {
        status: 500,
      },
    );
  }
}
