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

  // Guard no_invoice unik
  const { data: existing } = await db
    .from("invoice")
    .select("id")
    .eq("no_invoice", no_invoice)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "No invoice sudah dipakai" },
      { status: 400 },
    );
  }

  // INSERT INVOICE
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

  /* =========================
     AUTO POSTING JURNAL
     Dr Piutang
     Cr Pendapatan
  ========================== */

  // Ambil periode OPEN
  const { data: periode } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .single();

  if (periode) {
    const id_periode: number = periode.id_periode as number;

    // Ambil akun Piutang & Pendapatan (kode default)
    const { data: piutang } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "12001")
      .single();

    const { data: pendapatan } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "41001")
      .single();

    if (piutang && pendapatan) {
      const { data: jurnal } = await db
        .from("jurnal")
        .insert({
          tanggal,
          no_bukti: no_invoice,
          sumber: "UMUM",
          keterangan: `Invoice ${no_invoice}`,
          id_periode,
        })
        .select("id_jurnal")
        .single();

      if (jurnal) {
        await db.from("jurnal_detail").insert([
          {
            id_jurnal: jurnal.id_jurnal,
            id_coa: piutang.id_coa,
            debit: nominal,
            kredit: 0,
          },
          {
            id_jurnal: jurnal.id_jurnal,
            id_coa: pendapatan.id_coa,
            debit: 0,
            kredit: nominal,
          },
        ]);
      }
    }
  }

  return NextResponse.json(data, { status: 201 });
}
