import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pembayaranInvoiceSchema } from "@/lib/validators/pembayaran-invoice";
import { calcInvoiceStatus } from "@/lib/invoice/calc-status";

type PembayaranRow = {
  id: number;
  tanggal: string;
  id_invoice: number;
  nominal: number;
  keterangan: string;
};

/* =========================
   GET: List Pembayaran
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pembayaran_invoice")
    .select("id,tanggal,id_invoice,nominal,keterangan")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data pembayaran invoice" },
      { status: 500 },
    );
  }

  const result: PembayaranRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    id_invoice: r.id_invoice as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Pembayaran
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = pembayaranInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, id_invoice, nominal, keterangan } = parsed.data;

  // 1️⃣ Ambil invoice
  const { data: invoice, error: invoiceError } = await db
    .from("invoice")
    .select("id,nominal,status")
    .eq("id", id_invoice)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: "Invoice tidak ditemukan" },
      { status: 404 },
    );
  }

  const totalInvoice = Number(invoice.nominal);

  // 2️⃣ Hitung total bayar sebelumnya
  const { data: bayarRows, error: bayarError } = await db
    .from("pembayaran_invoice")
    .select("nominal")
    .eq("id_invoice", id_invoice);

  if (bayarError) {
    return NextResponse.json(
      { error: "Gagal ambil data pembayaran" },
      { status: 500 },
    );
  }

  const totalBayarSebelum = (bayarRows ?? []).reduce(
    (s: number, r) => s + Number(r.nominal),
    0,
  );

  const totalBayarBaru = totalBayarSebelum + nominal;

  if (totalBayarBaru > totalInvoice) {
    return NextResponse.json(
      { error: "Total pembayaran melebihi nilai invoice" },
      { status: 400 },
    );
  }

  // 3️⃣ Insert pembayaran
  const { data, error } = await db
    .from("pembayaran_invoice")
    .insert({
      tanggal,
      id_invoice,
      nominal,
      keterangan,
    })
    .select("id,tanggal,id_invoice,nominal,keterangan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert pembayaran" },
      { status: 500 },
    );
  }

  // 4️⃣ Update status invoice
  const newStatus = calcInvoiceStatus(totalInvoice, totalBayarBaru);

  const { error: statusError } = await db
    .from("invoice")
    .update({ status: newStatus })
    .eq("id", id_invoice);

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  const row: PembayaranRow = {
    id: data.id as number,
    tanggal: data.tanggal as string,
    id_invoice: data.id_invoice as number,
    nominal: Number(data.nominal),
    keterangan: data.keterangan as string,
  };

  return NextResponse.json(row, { status: 201 });
}
