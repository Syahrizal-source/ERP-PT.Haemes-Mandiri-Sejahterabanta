import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pembayaranInvoiceSchema,
  type PembayaranInvoiceInput,
} from "@/lib/validators/pembayaran-invoice";
import { postPembayaranInvoice } from "@/lib/accounting/postPembayaranInvoice";

/* =========================
   TYPES
========================= */

interface Row {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
}

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: Row[] = data ?? [];

  /* =========================
     HITUNG STATUS
  ========================= */

  const result = await Promise.all(
    rows.map(async (item) => {
      const { data: invoice } = await db
        .from("invoice")
        .select("nominal")
        .eq("id", item.id_invoice)
        .single();

      const nilaiInvoice: number = Number(invoice?.nominal ?? 0);

      const { data: pembayaran } = await db
        .from("pembayaran_invoice")
        .select("total")
        .eq("id_invoice", item.id_invoice);

      const totalBayar: number = (pembayaran ?? []).reduce(
        (sum, p) => sum + Number(p.total ?? 0),
        0,
      );

      let status: "UNPAID" | "PARTIAL" | "PAID";

      if (totalBayar >= nilaiInvoice && nilaiInvoice > 0) status = "PAID";
      else if (totalBayar > 0) status = "PARTIAL";
      else status = "UNPAID";

      let keteranganStatus: string;

      if (status === "PAID") keteranganStatus = "Pembayaran Lunas";
      else if (status === "PARTIAL") keteranganStatus = "Pembayaran Sebagian";
      else keteranganStatus = "Belum Dibayar";

      return {
        ...item,
        status,
        keterangan_status: keteranganStatus,
      };
    }),
  );

  return NextResponse.json(result);
}

async function updateStatusInvoice(id_invoice: number): Promise<void> {
  const { data: invoice } = await db
    .from("invoice")
    .select("nominal")
    .eq("id", id_invoice)
    .single();

  const nilaiInvoice: number = Number(invoice?.nominal ?? 0);

  const { data: pembayaran } = await db
    .from("pembayaran_invoice")
    .select("total")
    .eq("id_invoice", id_invoice);

  const totalBayar: number = (pembayaran ?? []).reduce(
    (sum, p) => sum + Number(p.total ?? 0),
    0,
  );

  let status: "UNPAID" | "PARTIAL" | "PAID";

  if (totalBayar >= nilaiInvoice && nilaiInvoice > 0) status = "PAID";
  else if (totalBayar > 0) status = "PARTIAL";
  else status = "UNPAID";

  await db.from("invoice").update({ status }).eq("id", id_invoice);
}
/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = pembayaranInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data pembayaran invoice tidak valid" },
        { status: 400 },
      );
    }

    const input: PembayaranInvoiceInput = parsed.data;

    /* =========================
       HITUNG PAJAK
    ========================= */

    const nominal: number = input.nominal;

    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;

    // const totalPiutang: number = nominal + ppn;
    const totalBayar: number = nominal + ppn - pph23;

    /* =========================
       ANTI MINUS
    ========================= */

    if (totalBayar <= 0) {
      return NextResponse.json(
        { error: "Total pembayaran tidak valid" },
        { status: 400 },
      );
    }

    /* =========================
       VALIDASI INVOICE
    ========================= */

    const { data: invoiceCheck } = await db
      .from("invoice")
      .select("id")
      .eq("id", input.id_invoice)
      .single();

    if (!invoiceCheck) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan" },
        { status: 400 },
      );
    }

    /* =========================
       INSERT
    ========================= */

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
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyimpan pembayaran invoice");
    }

    /* =========================
       JURNAL
    ========================= */

    const jurnalId: number = await postPembayaranInvoice(
      input.tanggal,
      `PBY-${data.id}`,
      input.keterangan,
      nominal,
      ppn,
      pph23,
    );

    await db
      .from("pembayaran_invoice")
      .update({ id_jurnal: jurnalId })
      .eq("id", data.id);

    await updateStatusInvoice(input.id_invoice);

    return NextResponse.json({
      message: "Pembayaran invoice berhasil",
      data,
    });
  } catch (error: unknown) {
    console.error("PEMBAYARAN INVOICE ERROR:", error);

    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
