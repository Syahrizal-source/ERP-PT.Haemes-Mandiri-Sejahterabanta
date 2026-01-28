import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { invoiceSchema } from "@/lib/validators/invoice";

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
   GET: List Invoice
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("invoice")
    .select("id,tanggal,no_invoice,customer,nominal,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data invoice" },
      { status: 500 },
    );
  }

  const result: InvoiceRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_invoice: r.no_invoice as string,
    customer: r.customer as string,
    nominal: Number(r.nominal),
    status: r.status as InvoiceRow["status"],
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Invoice
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = invoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, no_invoice, customer, nominal, status } = parsed.data;

  // Guard: no_invoice unik
  const { data: existing, error: existingError } = await db
    .from("invoice")
    .select("id")
    .eq("no_invoice", no_invoice)
    .single();

  if (existingError === null && existing) {
    return NextResponse.json(
      { error: "No invoice sudah dipakai" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("invoice")
    .insert({
      tanggal,
      no_invoice,
      customer,
      nominal,
      status,
    })
    .select("id,tanggal,no_invoice,customer,nominal,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert invoice" },
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

  return NextResponse.json(row, { status: 201 });
}
