import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import {
  pembayaranInvoiceSchema,
  type PembayaranInvoiceInput,
} from "@/lib/validators/pembayaran-invoice";

/* =========================
   PARAM VALIDATION
========================= */

const paramSchema = z.object({
  id: z.string(),
});

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const id: number = Number(parsed.data.id);

  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   PUT
========================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const id: number = Number(parsedParams.data.id);

    const body: unknown = await req.json();

    const parsedBody = pembayaranInvoiceSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PembayaranInvoiceInput = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;

    const totalPiutang: number = nominal + ppn;
    const totalBayar: number = totalPiutang - pph23;

    /* =========================
       ANTI MINUS
    ========================= */

    if (totalBayar <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
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
       UPDATE
    ========================= */

    const { data, error } = await db
      .from("pembayaran_invoice")
      .update({
        tanggal: input.tanggal,
        id_invoice: input.id_invoice,
        nominal,
        ppn,
        pph23,
        total: totalBayar,
        keterangan: input.keterangan,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "Pembayaran invoice berhasil diupdate",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const id: number = Number(parsed.data.id);

  const { error } = await db.from("pembayaran_invoice").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Pembayaran invoice berhasil dihapus",
  });
}
