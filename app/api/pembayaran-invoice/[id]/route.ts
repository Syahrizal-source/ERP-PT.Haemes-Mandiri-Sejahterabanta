import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pembayaranInvoiceSchema } from "@/lib/validators/pembayaran-invoice";
import { calcInvoiceStatus } from "@/lib/invoice/calc-status";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pembayaranId = Number(id);

  if (!Number.isInteger(pembayaranId)) {
    return NextResponse.json(
      { error: "ID pembayaran tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = pembayaranInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, id_invoice, nominal, keterangan } = parsed.data;

  const { data: existing, error: existingError } = await db
    .from("pembayaran_invoice")
    .select("id,nominal,id_invoice")
    .eq("id", pembayaranId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  // Total bayar selain row ini
  const { data: bayarRows } = await db
    .from("pembayaran_invoice")
    .select("nominal")
    .eq("id_invoice", id_invoice)
    .neq("id", pembayaranId);

  const totalBayarLain = (bayarRows ?? []).reduce(
    (s: number, r) => s + Number(r.nominal),
    0,
  );

  const { data: invoice } = await db
    .from("invoice")
    .select("nominal")
    .eq("id", id_invoice)
    .single();

  const totalInvoice = Number(invoice?.nominal ?? 0);
  const totalBayarBaru = totalBayarLain + nominal;

  if (totalBayarBaru > totalInvoice) {
    return NextResponse.json(
      { error: "Total pembayaran melebihi nilai invoice" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("pembayaran_invoice")
    .update({
      tanggal,
      id_invoice,
      nominal,
      keterangan,
    })
    .eq("id", pembayaranId)
    .select("id,tanggal,id_invoice,nominal,keterangan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update pembayaran" },
      { status: 500 },
    );
  }

  const newStatus = calcInvoiceStatus(totalInvoice, totalBayarBaru);

  await db.from("invoice").update({ status: newStatus }).eq("id", id_invoice);

  return NextResponse.json(data);
}

/* =========================
   DELETE: Delete Pembayaran
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pembayaranId = Number(id);

  if (!Number.isInteger(pembayaranId)) {
    return NextResponse.json(
      { error: "ID pembayaran tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("pembayaran_invoice")
    .select("id,id_invoice,nominal")
    .eq("id", pembayaranId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const id_invoice = existing.id_invoice as number;

  const { error } = await db
    .from("pembayaran_invoice")
    .delete()
    .eq("id", pembayaranId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalc status invoice
  const { data: bayarRows } = await db
    .from("pembayaran_invoice")
    .select("nominal")
    .eq("id_invoice", id_invoice);

  const totalBayar = (bayarRows ?? []).reduce(
    (s: number, r) => s + Number(r.nominal),
    0,
  );

  const { data: invoice } = await db
    .from("invoice")
    .select("nominal")
    .eq("id", id_invoice)
    .single();

  const totalInvoice = Number(invoice?.nominal ?? 0);

  const newStatus = calcInvoiceStatus(totalInvoice, totalBayar);

  await db.from("invoice").update({ status: newStatus }).eq("id", id_invoice);

  return NextResponse.json({ success: true });
}
