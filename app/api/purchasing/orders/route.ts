import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchaseOrderSchema,
  type PurchaseOrderInput,
} from "@/lib/validators/purchasing/purchase-order";

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

export async function GET() {
  try {
    const { data, error } = await db
      .from("purchase_orders")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders: PurchaseOrderRow[] = data ?? [];

    return NextResponse.json(orders);
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

    const parsed = PurchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data purchase order tidak valid" },
        { status: 400 },
      );
    }

    const input: PurchaseOrderInput = parsed.data;

    const { data: orderInsert, error: orderError } = await db
      .from("purchase_orders")
      .insert({
        nomor: input.nomor,
        tanggal: input.tanggal,
        vendor_id: input.vendor_id,
        id_proyek: input.id_proyek ?? null,
        keterangan: input.keterangan ?? null,
        status: input.status ?? "DRAFT",
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const order: PurchaseOrderRow = orderInsert;

    const itemsPayload = input.items.map((item) => ({
      purchase_order_id: order.id,
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

    const { data: periode, error: periodeError } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (periodeError || !periode) {
      return NextResponse.json(
        { error: "Periode OPEN tidak ditemukan" },
        { status: 400 },
      );
    }

    const noBukti: string = `PO-${order.nomor}`;

    const { data: jurnalInsert, error: jurnalError } = await db
      .from("jurnal")
      .insert({
        tanggal: input.tanggal,
        no_bukti: noBukti,
        sumber: "PURCHASING",
        keterangan: `Purchase Order ${order.nomor}`,
        id_periode: periode.id_periode,
        is_posted: true,
        posted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jurnalError) {
      return NextResponse.json({ error: jurnalError.message }, { status: 500 });
    }

    const jurnalId: number = jurnalInsert.id_jurnal;

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

    if (!coaBeban || !coaHutang) {
      return NextResponse.json(
        { error: "COA tidak ditemukan" },
        { status: 400 },
      );
    }

    const jurnalDetail = [
      {
        id_jurnal: jurnalId,
        id_coa: coaBeban.id_coa,
        debit: total,
        kredit: 0,
        id_proyek: input.id_proyek ?? null,
      },
      {
        id_jurnal: jurnalId,
        id_coa: coaHutang.id_coa,
        debit: 0,
        kredit: total,
        id_proyek: input.id_proyek ?? null,
      },
    ];

    const { error: detailError } = await db
      .from("jurnal_detail")
      .insert(jurnalDetail);

    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Purchase order berhasil dibuat",
      order,
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
