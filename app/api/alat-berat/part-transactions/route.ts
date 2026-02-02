import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { partTransactionCreateSchema } from "@/lib/zod/partTransaction.schema";

export async function GET() {
  const { data, error } = await db
    .from("part_transactions")
    .select(
      `
      id,
      transaction_type,
      qty,
      transaction_date,
      part_id,
      wo_id,
      ppn,
      pph21,
      pph23,
      pph4
    `,
    )
    .order("transaction_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = partTransactionCreateSchema.parse(body);

    const { data, error } = await db
      .from("part_transactions")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // ⛔ stok & jurnal handled by trigger
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
