import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

type PostingInput = {
  invoice_id: number;
  id_periode: number;
  id_akun_piutang: number;
};

type InvoiceRow = {
  id: number;
  tanggal: string;
  no_invoice: string;
  nominal: number;
  keterangan: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      invoice_id: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_piutang: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { invoice_id, id_periode, id_akun_piutang } = parsed.data;

  const { data: invoice, error: invoiceError } = await db
    .from("invoice")
    .select("id,tanggal,no_invoice,nominal,customer")
    .eq("id", invoice_id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: "Invoice tidak ditemukan" },
      { status: 404 },
    );
  }

  const row: InvoiceRow = {
    id: invoice.id as number,
    tanggal: invoice.tanggal as string,
    no_invoice: invoice.no_invoice as string,
    nominal: Number(invoice.nominal),
    keterangan: `Invoice ${invoice.no_invoice}`,
  };

  if (row.nominal <= 0) {
    return NextResponse.json(
      { error: "Nominal invoice tidak valid" },
      { status: 400 },
    );
  }

  // Cek periode
  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("id_periode", id_periode)
    .single();

  if (periodeError || !periode) {
    return NextResponse.json(
      { error: "Periode tidak ditemukan" },
      { status: 404 },
    );
  }

  if (periode.status === "CLOSED") {
    return NextResponse.json(
      { error: "Periode sudah CLOSED" },
      { status: 400 },
    );
  }

  // Ambil COA pendapatan
  const { data: coaRows, error: coaError } = await db
    .from("coa")
    .select("id_coa")
    .eq("tipe", "PENDAPATAN")
    .limit(1);

  if (coaError || !coaRows || coaRows.length === 0) {
    return NextResponse.json(
      { error: "COA pendapatan belum ada" },
      { status: 500 },
    );
  }

  const akunPendapatanId: number = coaRows[0].id_coa as number;

  // Insert header jurnal
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: row.tanggal,
      no_bukti: row.no_invoice,
      keterangan: row.keterangan,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal invoice" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  const details: {
    id_jurnal: number;
    id_coa: number;
    debit: number;
    kredit: number;
  }[] = [
    {
      id_jurnal,
      id_coa: id_akun_piutang,
      debit: row.nominal,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: akunPendapatanId,
      debit: 0,
      kredit: row.nominal,
    },
  ];

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal invoice tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    invoice_id: row.id,
  });
}
