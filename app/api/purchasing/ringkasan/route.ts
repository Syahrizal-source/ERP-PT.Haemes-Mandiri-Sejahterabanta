import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RingkasanPurchasing = {
  total_po: number;
  total_receipt: number;
  total_payment: number;
  total_ppn: number;
  total_pph23: number;
  total_pph4: number;
  total_hutang_vendor: number;
};

function sumNumeric<T>(rows: T[] | null, field: keyof T): number {
  if (!rows || rows.length === 0) return 0;

  return rows.reduce((acc: number, row: T) => {
    const value = row[field];

    if (typeof value === "number") return acc + value;
    if (typeof value === "string") return acc + Number(value);

    return acc;
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    const { data: po } = await db.from("purchase_orders").select("id");

    const { data: receipt } = await db
      .from("purchase_receipts")
      .select("total");

    const { data: payment } = await db
      .from("purchase_payments")
      .select("jumlah,ppn,pph23,pph4");

    const total_po: number = po ? po.length : 0;

    const total_receipt: number = sumNumeric(receipt, "total");

    const total_payment: number = sumNumeric(payment, "jumlah");

    const total_ppn: number = sumNumeric(payment, "ppn");

    const total_pph23: number = sumNumeric(payment, "pph23");

    const total_pph4: number = sumNumeric(payment, "pph4");

    const total_hutang_vendor: number = total_receipt - total_payment;

    const result: RingkasanPurchasing = {
      total_po,
      total_receipt,
      total_payment,
      total_ppn,
      total_pph23,
      total_pph4,
      total_hutang_vendor,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
