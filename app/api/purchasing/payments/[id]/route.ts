import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  PurchasePaymentSchema,
  type PurchasePaymentInput,
} from "@/lib/validators/purchasing/purchase-payment";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from("purchase_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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

    const { error } = await db
      .from("purchase_payments")
      .update({
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
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payment berhasil diupdate",
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

    const { error } = await db.from("purchase_payments").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Payment berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
