import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";
import {
  pembayaranInvoiceSchema,
  type PembayaranInvoiceInput,
} from "@/lib/validators/pembayaran-invoice";
import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";

/* =========================================================
   PARAM VALIDATION
========================================================= */

const paramSchema = z.object({
  id: z.string().trim().min(1, "ID pembayaran wajib diisi"),
});

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================================================
   TYPES
========================================================= */

interface PembayaranInvoiceRow {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  ppn: number | null;
  pph23: number | null;
  total: number | null;
  keterangan: string;
  id_jurnal: number | null;
  id_coa_debit: number | null;
  created_at: string;
}

interface InvoiceSaldoRow {
  id: number;
  no_invoice: string;
  customer: string;
  nominal: number;
  total_neto: number | null;
  nilai_tagihan: number;
  total_dibayar: number;
  sisa_tagihan: number;
  status: string;
}

interface CoaRow {
  id_coa: number;
  kode: string;
  nama: string;
  tipe: string;
  aktif: boolean;
  is_cash: boolean;
  is_header: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parsePositiveNumber(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

/**
 * Validasi COA penerimaan pembayaran.
 *
 * Syarat:
 * - COA harus ada
 * - aktif
 * - akun detail, bukan header
 * - tipe ASET
 * - is_cash = true
 *
 * Tidak menggunakan hardcoded id_coa.
 */
async function getValidCoaPembayaran(
  idCoaDebit: number,
): Promise<CoaRow> {
  const { data, error } = await db
    .from("coa")
    .select(
      "id_coa,kode,nama,tipe,aktif,is_cash,is_header",
    )
    .eq("id_coa", idCoaDebit)
    .eq("aktif", true)
    .eq("is_cash", true)
    .eq("is_header", false)
    .eq("tipe", "ASET")
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal validasi COA penerimaan: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "COA penerimaan tidak valid. Pilih akun Kas/Bank aktif yang merupakan akun detail.",
    );
  }

  return data as CoaRow;
}

/**
 * Ambil saldo invoice dari view yang sudah dibuat.
 *
 * Sumber nilai tagihan:
 * v_invoice_saldo.nilai_tagihan
 *
 * Sumber pembayaran:
 * SUM(pembayaran_invoice.total)
 */
async function getInvoiceSaldo(
  idInvoice: number,
): Promise<InvoiceSaldoRow> {
  const { data, error } = await db
    .from("v_invoice_saldo")
    .select(
      `
        id,
        no_invoice,
        customer,
        nominal,
        total_neto,
        nilai_tagihan,
        total_dibayar,
        sisa_tagihan,
        status
      `,
    )
    .eq("id", idInvoice)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal membaca saldo invoice: ${error.message}`);
  }

  if (!data) {
    throw new Error("Invoice tidak ditemukan.");
  }

  return data as InvoiceSaldoRow;
}

/**
 * Hitung total pembayaran invoice dengan mengecualikan
 * pembayaran yang sedang di-update.
 *
 * Ini penting agar PUT tidak menghitung pembayaran lama
 * sebagai pembayaran tambahan.
 */
async function getTotalPembayaranLain(
  idInvoice: number,
  excludePaymentId: number,
): Promise<number> {
  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("total")
    .eq("id_invoice", idInvoice)
    .neq("id", excludePaymentId);

  if (error) {
    throw new Error(
      `Gagal membaca pembayaran invoice: ${error.message}`,
    );
  }

  return (data ?? []).reduce((sum, row) => {
    const value =
      typeof row.total === "number"
        ? row.total
        : Number(row.total ?? 0);

    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/**
 * Update status invoice berdasarkan saldo aktual.
 *
 * Status tidak ditentukan manual dari request.
 */
async function updateInvoiceStatus(
  idInvoice: number,
): Promise<void> {
  const saldo = await getInvoiceSaldo(idInvoice);

  const nilaiTagihan = Number(saldo.nilai_tagihan ?? 0);
  const totalDibayar = Number(saldo.total_dibayar ?? 0);

  let status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";

  if (nilaiTagihan <= 0) {
    status = "Unpaid (Menunggu Pembayaran)";
  } else if (totalDibayar <= 0) {
    status = "Unpaid (Menunggu Pembayaran)";
  } else if (totalDibayar < nilaiTagihan) {
    status = "Partial (Pembayaran Sebagian)";
  } else {
    status = "Paid (Pembayaran Penuh/ Lunas)";
  }

  const { error } = await db
    .from("invoice")
    .update({
      status,
    })
    .eq("id", idInvoice);

  if (error) {
    throw new Error(
      `Gagal memperbarui status invoice: ${error.message}`,
    );
  }
}

/* =========================================================
   GET BY ID
========================================================= */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsed = paramSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ID pembayaran tidak valid" },
        { status: 400 },
      );
    }

    const id = parsePositiveInteger(parsed.data.id);

    if (id === null) {
      return NextResponse.json(
        { error: "ID pembayaran harus berupa bilangan bulat positif" },
        { status: 400 },
      );
    }

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
          id_jurnal,
          id_coa_debit,
          created_at
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Pembayaran invoice tidak ditemukan" },
        { status: 404 },
      );
    }

    const payment = data as PembayaranInvoiceRow;

    let coaDebit: CoaRow | null = null;

    if (payment.id_coa_debit !== null) {
      const { data: coaData, error: coaError } = await db
        .from("coa")
        .select(
          "id_coa,kode,nama,tipe,aktif,is_cash,is_header",
        )
        .eq("id_coa", payment.id_coa_debit)
        .maybeSingle();

      if (coaError) {
        return NextResponse.json(
          {
            error: `Gagal membaca COA pembayaran: ${coaError.message}`,
          },
          { status: 500 },
        );
      }

      coaDebit = (coaData as CoaRow | null) ?? null;
    }

    const invoice = await getInvoiceSaldo(payment.id_invoice);

    return NextResponse.json({
      ...payment,
      coa_debit: coaDebit,
      invoice,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengambil pembayaran invoice";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/* =========================================================
   PUT
========================================================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    /* =====================================================
       PARAM
    ===================================================== */

    const params = await ctx.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "ID pembayaran tidak valid" },
        { status: 400 },
      );
    }

    const id = parsePositiveInteger(parsedParams.data.id);

    if (id === null) {
      return NextResponse.json(
        {
          error:
            "ID pembayaran harus berupa bilangan bulat positif",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body: unknown = await req.json();

    const parsedBody =
      pembayaranInvoiceSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Data pembayaran tidak valid",
          details: parsedBody.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input: PembayaranInvoiceInput = parsedBody.data;

    /* =====================================================
       VALIDASI PEMBAYARAN LAMA
    ===================================================== */

    const { data: existingPayment, error: existingError } =
      await db
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
            id_jurnal,
            id_coa_debit,
            created_at
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Gagal membaca pembayaran lama: ${existingError.message}`,
        },
        { status: 500 },
      );
    }

    if (!existingPayment) {
      return NextResponse.json(
        {
          error: "Pembayaran invoice tidak ditemukan",
        },
        { status: 404 },
      );
    }

    const oldPayment =
      existingPayment as PembayaranInvoiceRow;

    /* =====================================================
       JURNAL LAMA
       
       Pembayaran yang sudah diposting jangan diubah
       sembarangan karena sudah terhubung ke jurnal.
    ===================================================== */

    if (oldPayment.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pembayaran sudah terhubung dengan jurnal posted dan tidak dapat diedit langsung. Gunakan mekanisme pembatalan/reversal jurnal terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    /* =====================================================
       VALIDASI COA PENERIMAAN
    ===================================================== */

    const coaDebit = await getValidCoaPembayaran(
      input.id_coa_debit,
    );

    /* =====================================================
       VALIDASI INVOICE
    ===================================================== */

    const invoice = await getInvoiceSaldo(
      input.id_invoice,
    );

    /* =====================================================
       NOMINAL
       
       Pembayaran aktual:
       total = nominal

       Tidak menghitung:
       nominal + PPN 11% - PPh23 2%

       PPN/PPh invoice adalah bagian tagihan,
       bukan otomatis ditambahkan ulang saat pembayaran.
    ===================================================== */

    const nominal = parsePositiveNumber(input.nominal);

    if (nominal === null) {
      return NextResponse.json(
        {
          error:
            "Nominal pembayaran harus lebih besar dari 0",
        },
        { status: 400 },
      );
    }

    const ppn = 0;
    const pph23 = 0;
    const totalBayar = nominal;

    if (!Number.isFinite(totalBayar) || totalBayar <= 0) {
      return NextResponse.json(
        { error: "Total pembayaran tidak valid" },
        { status: 400 },
      );
    }

    /* =====================================================
       CEK PEMBAYARAN LAIN
       
       Pembayaran yang sedang diedit dikeluarkan dari
       perhitungan.
    ===================================================== */

    const totalPembayaranLain =
      await getTotalPembayaranLain(
        input.id_invoice,
        id,
      );

    const nilaiTagihan = Number(
      invoice.nilai_tagihan ?? 0,
    );

    if (
      !Number.isFinite(nilaiTagihan) ||
      nilaiTagihan <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Nilai tagihan invoice tidak valid",
        },
        { status: 400 },
      );
    }

    const totalSetelahUpdate =
      totalPembayaranLain + totalBayar;

    if (totalSetelahUpdate > nilaiTagihan) {
      const sisaYangTersedia =
        Math.max(
          nilaiTagihan - totalPembayaranLain,
          0,
        );

      return NextResponse.json(
        {
          error:
            "Pembayaran melebihi sisa tagihan invoice",
          detail: {
            nilai_tagihan: nilaiTagihan,
            total_pembayaran_lain: totalPembayaranLain,
            pembayaran_baru: totalBayar,
            maksimal_pembayaran: sisaYangTersedia,
          },
        },
        { status: 400 },
      );
    }

    /* =====================================================
       UPDATE PAYMENT
       
       id_coa_debit disimpan sebagai sumber akun
       penerimaan pembayaran.
    ===================================================== */

    const { data, error } = await db
      .from("pembayaran_invoice")
      .update({
        tanggal: input.tanggal,
        id_invoice: input.id_invoice,
        id_coa_debit: coaDebit.id_coa,
        nominal,
        ppn,
        pph23,
        total: totalBayar,
        keterangan: input.keterangan,
      })
      .eq("id", id)
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
          id_jurnal,
          id_coa_debit,
          created_at
        `,
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Gagal update pembayaran invoice: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        "Data pembayaran tidak ditemukan setelah update",
      );
    }

    /* =====================================================
       UPDATE STATUS INVOICE
    ===================================================== */

    await updateInvoiceStatus(input.id_invoice);

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      message: "Pembayaran invoice berhasil diupdate",
      data: {
        ...(data as PembayaranInvoiceRow),
        coa_debit: coaDebit,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat update pembayaran invoice";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsed = paramSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "ID pembayaran tidak valid" },
        { status: 400 },
      );
    }

    const id = parsePositiveInteger(parsed.data.id);

    if (id === null) {
      return NextResponse.json(
        {
          error:
            "ID pembayaran harus berupa bilangan bulat positif",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       CEK PAYMENT
    ===================================================== */

    const { data: payment, error: paymentError } =
      await db
        .from("pembayaran_invoice")
        .select(
          `
            id,
            id_invoice,
            id_jurnal,
            total
          `,
        )
        .eq("id", id)
        .maybeSingle();

    if (paymentError) {
      return NextResponse.json(
        {
          error: paymentError.message,
        },
        { status: 500 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Pembayaran invoice tidak ditemukan",
        },
        { status: 404 },
      );
    }

    /* =====================================================
       JANGAN HAPUS PAYMENT YANG SUDAH TERPOSTING
    ===================================================== */

    if (payment.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pembayaran sudah terhubung dengan jurnal posted dan tidak dapat dihapus langsung. Gunakan mekanisme pembatalan/reversal jurnal terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    const idInvoice = Number(payment.id_invoice);

    /* =====================================================
       DELETE
    ===================================================== */

    const { error: deleteError } = await db
      .from("pembayaran_invoice")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error: deleteError.message,
        },
        { status: 500 },
      );
    }

    /* =====================================================
       UPDATE STATUS INVOICE
    ===================================================== */

    await updateInvoiceStatus(idInvoice);

    return NextResponse.json({
      message:
        "Pembayaran invoice berhasil dihapus",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menghapus pembayaran invoice";

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}