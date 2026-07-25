import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchasePaymentSchema,
  type PurchasePaymentInput,
} from "@/lib/validators/purchasing/purchase-payment";

type PaymentRow = {
  id: string;
  receipt_id: string | null;
  tanggal: string;
  vendor_id: number | null;
  subtotal: number;
  ppn: number;
  pph21: number;
  pph23: number;
  pph4: number;
  jumlah: number;
  metode: string | null;
  id_jurnal: number | null;
  created_at: string;
};

export async function GET() {
  try {
    const { data, error } = await db
      .from("purchase_payments")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payments: PaymentRow[] = data ?? [];

    return NextResponse.json(payments);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();

    const parsed = PurchasePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data payment tidak valid" },
        { status: 400 },
      );
    }

    const input: PurchasePaymentInput = parsed.data;

    const subtotal: number = Number(input.subtotal);

    const ppn: number = subtotal * 0.11;
    const pph23: number = subtotal * 0.02;
    const pph4: number = subtotal * 0.1;

    const jumlah: number = subtotal + ppn - pph23 - pph4;

    const { data: paymentInsert, error: paymentError } = await db
      .from("purchase_payments")
      .insert({
        receipt_id: input.receipt_id ?? null,
        tanggal: input.tanggal,
        vendor_id: input.vendor_id,
        subtotal,
        ppn,
        pph21: 0,
        pph23,
        pph4,
        jumlah,
        metode: input.metode ?? null,
      })
      .select()
      .single();

    if (paymentError || !paymentInsert) {
      return NextResponse.json(
        { error: paymentError?.message ?? "Gagal membuat payment" },
        { status: 500 },
      );
    }

    const payment: PaymentRow = paymentInsert;

    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      return NextResponse.json(
        { error: "Periode OPEN tidak ditemukan" },
        { status: 400 },
      );
    }

    const { data: coaKas } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "11001")
      .single();

    const { data: coaHutang } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "21001")
      .single();

    const { data: coaPPh23 } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22003")
      .single();

    const { data: coaPPh4 } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22013")
      .single();

    if (!coaKas || !coaHutang || !coaPPh23 || !coaPPh4) {
      return NextResponse.json(
        { error: "COA pembayaran tidak lengkap" },
        { status: 400 },
      );
    }

    const noBukti: string = `PAY-${payment.id}`;

    const { data: jurnalInsert, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: payment.tanggal,
        no_bukti: noBukti,
        sumber: "PURCHASING",
        keterangan: "Vendor Payment",
        id_periode: periode.id_periode,
      })
      .select()
      .single();

    if (jurnalError || !jurnalInsert) {
      return NextResponse.json(
        { error: jurnalError?.message ?? "Gagal membuat jurnal" },
        { status: 500 },
      );
    }

    const jurnalId: number = jurnalInsert.id_jurnal;

    await db
      .from("purchase_payments")
      .update({ id_jurnal: jurnalId })
      .eq("id", payment.id);

    const jurnalDetail = [
      {
        id_jurnal: jurnalId,
        id_coa: coaHutang.id_coa,
        debit: subtotal + ppn,
        kredit: 0,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: jumlah,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaPPh23.id_coa,
        debit: 0,
        kredit: pph23,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaPPh4.id_coa,
        debit: 0,
        kredit: pph4,
      },
    ];

    const { error: detailError } = await db
      .from("jurnal_detail")
      .insert(jurnalDetail);

    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payment berhasil dibuat",
      payment,
      subtotal,
      ppn,
      pph23,
      pph4,
      jumlah,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
