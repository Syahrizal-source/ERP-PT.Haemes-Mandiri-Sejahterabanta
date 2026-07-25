import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchaseReceiptSchema,
  type PurchaseReceiptInput,
} from "@/lib/validators/purchasing/purchase-receipt";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const { data: receipt, error: receiptError } = await db
      .from("purchase_receipts")
      .select("*")
      .eq("id", id)
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: receiptError.message },
        { status: 500 },
      );
    }

    const { data: items, error: itemsError } = await db
      .from("purchase_receipt_items")
      .select("*")
      .eq("receipt_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      receipt,
      items: items ?? [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const body: unknown = await req.json();

    const parsed = PurchaseReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data receipt tidak valid" },
        { status: 400 },
      );
    }

    const input: PurchaseReceiptInput = parsed.data;

    await db.from("purchase_receipt_items").delete().eq("receipt_id", id);

    const itemsPayload = input.items.map((item) => ({
      receipt_id: id,
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

    const { data: receiptUpdate, error: receiptError } = await db
      .from("purchase_receipts")
      .update({
        purchase_order_id: input.purchase_order_id ?? null,
        tanggal: input.tanggal,
        vendor_id: input.vendor_id,
        id_proyek: input.id_proyek ?? null,
        total,
        ppn,
        pph23,
        pph4,
        grand_total: grandTotal,
      })
      .eq("id", id)
      .select()
      .single();

    if (receiptError) {
      return NextResponse.json(
        { error: receiptError.message },
        { status: 500 },
      );
    }

    const receipt: ReceiptRow = receiptUpdate;

    if (receipt.id_jurnal) {
      await db
        .from("jurnal_detail")
        .delete()
        .eq("id_jurnal", receipt.id_jurnal);

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
          id_jurnal: receipt.id_jurnal,
          id_coa: coaPersediaan.id_coa,
          debit: total,
          kredit: 0,
          id_proyek: input.id_proyek ?? null,
        },
        {
          id_jurnal: receipt.id_jurnal,
          id_coa: coaPPN?.id_coa ?? coaPersediaan.id_coa,
          debit: ppn,
          kredit: 0,
          id_proyek: input.id_proyek ?? null,
        },
        {
          id_jurnal: receipt.id_jurnal,
          id_coa: coaHutang.id_coa,
          debit: 0,
          kredit: grandTotal,
          id_proyek: input.id_proyek ?? null,
        },
      ];

      await db.from("jurnal_detail").insert(jurnalDetail);
    }

    return NextResponse.json({
      message: "Receipt berhasil diupdate",
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

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const { error } = await db.from("purchase_receipts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Receipt berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
