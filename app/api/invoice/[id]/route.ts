import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { invoiceSchema } from "@/lib/validators/invoice";

type Params = { id: string };

type InvoiceRow = {
  id: number;
  tanggal: string;
  no_invoice: string;
  customer: string;
  nominal: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
};

/* =========================
   PUT: Update Invoice
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json(
      { error: "ID invoice tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = invoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, no_invoice, customer, nominal, status } = parsed.data;

  const { data: existing, error: existingError } = await db
    .from("invoice")
    .select("id")
    .eq("id", invoiceId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Invoice tidak ditemukan" },
      { status: 404 },
    );
  }

  // Guard: no_invoice unik
  const { data: duplicate, error: duplicateError } = await db
    .from("invoice")
    .select("id")
    .eq("no_invoice", no_invoice)
    .neq("id", invoiceId)
    .single();

  if (duplicateError === null && duplicate) {
    return NextResponse.json(
      { error: "No invoice sudah dipakai" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("invoice")
    .update({
      tanggal,
      no_invoice,
      customer,
      nominal,
      status,
    })
    .eq("id", invoiceId)
    .select("id,tanggal,no_invoice,customer,nominal,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update invoice" },
      { status: 500 },
    );
  }

  const row: InvoiceRow = {
    id: data.id as number,
    tanggal: data.tanggal as string,
    no_invoice: data.no_invoice as string,
    customer: data.customer as string,
    nominal: Number(data.nominal),
    status: data.status as InvoiceRow["status"],
  };

  return NextResponse.json(row);
}

/* =========================
   DELETE: Delete Invoice
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isInteger(invoiceId)) {
    return NextResponse.json(
      { error: "ID invoice tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("invoice")
    .select("id")
    .eq("id", invoiceId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Invoice tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("invoice").delete().eq("id", invoiceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
