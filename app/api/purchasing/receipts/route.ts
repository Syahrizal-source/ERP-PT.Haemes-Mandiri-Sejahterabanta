import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchaseReceiptSchema,
  type PurchaseReceiptInput,
} from "@/lib/validators/purchasing/purchase-receipt";

type ReceiptRow = {
  id: string;
  purchase_order_id: string | null;
  tanggal: string;
  vendor_id: number | null;
  id_proyek: string | null;
  total: number | null;
  ppn: number | null;
  pph21: number | null;
  pph23: number | null;
  pph4: number | null;
  grand_total: number | null;
  id_jurnal: number | null;
  created_at: string;
};

type ReceiptItemRow = {
  id: string;
  receipt_id: string;
  nama_item: string;
  qty: number;
  harga: number;
  subtotal: number;
  created_at: string;
};

export async function GET() {
  try {
    const { data, error } = await db
      .from("purchase_receipts")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const receipts: ReceiptRow[] = data ?? [];

    return NextResponse.json(receipts);
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

    const parsed = PurchaseReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data receipt tidak valid" },
        { status: 400 },
      );
    }

    const input: PurchaseReceiptInput = parsed.data;

    const { data: receiptInsert, error: receiptError } = await db
      .from("purchase_receipts")
      .insert({
        purchase_order_id: input.purchase_order_id ?? null,
        tanggal: input.tanggal,
        vendor_id: input.vendor_id,
        id_proyek: input.id_proyek ?? null,
      })
      .select()
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: receiptError.message },
        { status: 500 },
      );
    }

    const receipt: ReceiptRow = receiptInsert;

    const itemsPayload = input.items.map((item) => ({
      receipt_id: receipt.id,
      nama_item: item.nama_item,
      qty: item.qty,
      harga: item.harga,
    }));

    const { data: itemsInsert, error: itemsError } = await db
      .from("purchase_receipt_items")
      .insert(itemsPayload)
      .select();

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const items: ReceiptItemRow[] = itemsInsert ?? [];

    const total: number = items.reduce(
      (acc: number, row: ReceiptItemRow) => acc + Number(row.subtotal),
      0,
    );

    const ppn: number = total * 0.11;

    const pph23: number = total * 0.02;

    const pph4: number = total * 0.1;

    const grandTotal: number = total + ppn - pph23 - pph4;

    await db
      .from("purchase_receipts")
      .update({
        total,
        ppn,
        pph23,
        pph4,
        grand_total: grandTotal,
      })
      .eq("id", receipt.id);

    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      return NextResponse.json(
        { error: "Periode tidak ditemukan" },
        { status: 400 },
      );
    }

    const noBukti: string = `GR-${receipt.id}`;

    const { data: jurnalInsert, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: input.tanggal,
        no_bukti: noBukti,
        sumber: "PURCHASING",
        keterangan: "Goods Receipt",
        id_periode: periode.id_periode,
      })
      .select()
      .single();

    if (jurnalError) {
      return NextResponse.json({ error: jurnalError.message }, { status: 500 });
    }

    const jurnalId: number = jurnalInsert.id_jurnal;

    await db
      .from("purchase_receipts")
      .update({ id_jurnal: jurnalId })
      .eq("id", receipt.id);

    const { data: coaPersediaan } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "13001")
      .single();

    const { data: coaHutang } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "21001")
      .single();

    const { data: coaPPN } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "12020")
      .single();

    if (!coaPersediaan || !coaHutang) {
      return NextResponse.json(
        { error: "COA tidak ditemukan" },
        { status: 400 },
      );
    }

    const jurnalDetail = [
      {
        id_jurnal: jurnalId,
        id_coa: coaPersediaan.id_coa,
        debit: total,
        kredit: 0,
        id_proyek: input.id_proyek ?? null,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaPPN?.id_coa ?? coaPersediaan.id_coa,
        debit: ppn,
        kredit: 0,
        id_proyek: input.id_proyek ?? null,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaHutang.id_coa,
        debit: 0,
        kredit: grandTotal,
        id_proyek: input.id_proyek ?? null,
      },
    ];

    await db.from("jurnal_detail").insert(jurnalDetail);

    return NextResponse.json({
      message: "Receipt berhasil dibuat",
      receipt,
      items,
      total,
      ppn,
      pph23,
      pph4,
      grandTotal,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
