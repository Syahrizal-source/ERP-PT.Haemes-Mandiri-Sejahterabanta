import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchaseOrderSchema,
  type PurchaseOrderInput,
} from "@/lib/validators/purchasing/purchase-order";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type PurchaseOrderRow = {
  id: string;
  nomor: string;
  tanggal: string;
  vendor_id: number | null;
  id_proyek: string | null;
  keterangan: string | null;
  status: string | null;
  created_at: string;
};

type PurchaseOrderItemRow = {
  id: string;
  purchase_order_id: string;
  nama_item: string;
  qty: number;
  harga: number;
  subtotal: number;
  created_at: string;
};

/* ===============================
   GET
================================ */

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const { data: order, error: orderError } = await db
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const { data: items, error: itemsError } = await db
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", id);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      order,
      items: items ?? [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* ===============================
   PUT (UPDATE)
================================ */

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const body: unknown = await req.json();

    const parsed = PurchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data purchase order tidak valid" },
        { status: 400 },
      );
    }

    const input: PurchaseOrderInput = parsed.data;

    const { data: orderUpdate, error: orderError } = await db
      .from("purchase_orders")
      .update({
        nomor: input.nomor,
        tanggal: input.tanggal,
        vendor_id: input.vendor_id,
        id_proyek: input.id_proyek ?? null,
        keterangan: input.keterangan ?? null,
        status: input.status ?? "DRAFT",
      })
      .eq("id", id)
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    await db.from("purchase_order_items").delete().eq("purchase_order_id", id);

    const itemsPayload = input.items.map((item) => ({
      purchase_order_id: id,
      nama_item: item.nama_item,
      qty: item.qty,
      harga: item.harga,
    }));

    const { data: itemsInsert, error: itemsError } = await db
      .from("purchase_order_items")
      .insert(itemsPayload)
      .select();

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const items: PurchaseOrderItemRow[] = itemsInsert ?? [];

    const total: number = items.reduce(
      (acc: number, row: PurchaseOrderItemRow) => acc + Number(row.subtotal),
      0,
    );

    const { data: jurnal } = await db
      .from("jurnal")
      .select("id_jurnal")
      .eq("no_bukti", `PO-${input.nomor}`)
      .single();

    if (jurnal) {
      await db.from("jurnal_detail").delete().eq("id_jurnal", jurnal.id_jurnal);

      const { data: coaBeban } = await db
        .from("coa")
        .select("id_coa")
        .eq("kode", "51004")
        .single();

      const { data: coaHutang } = await db
        .from("coa")
        .select("id_coa")
        .eq("kode", "21001")
        .single();

      if (coaBeban && coaHutang) {
        const jurnalDetail = [
          {
            id_jurnal: jurnal.id_jurnal,
            id_coa: coaBeban.id_coa,
            debit: total,
            kredit: 0,
            id_proyek: input.id_proyek ?? null,
          },
          {
            id_jurnal: jurnal.id_jurnal,
            id_coa: coaHutang.id_coa,
            debit: 0,
            kredit: total,
            id_proyek: input.id_proyek ?? null,
          },
        ];

        await db.from("jurnal_detail").insert(jurnalDetail);
      }
    }

    return NextResponse.json({
      message: "Purchase order berhasil diupdate",
      order: orderUpdate,
      items,
      total,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* ===============================
   DELETE
================================ */

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const { error } = await db.from("purchase_orders").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Purchase order berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
