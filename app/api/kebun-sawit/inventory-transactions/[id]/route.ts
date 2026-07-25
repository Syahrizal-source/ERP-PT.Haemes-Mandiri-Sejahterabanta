import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { inventoryTransactionUpdateSchema } from "@/lib/validators/inventory-transaction";

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

type ParamsContext = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _req: NextRequest,
  ctx: ParamsContext,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const { id } = parsed.data;

  const { data, error } = await db
    .from("inventory_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   UPDATE
========================= */

export async function PUT(
  req: NextRequest,
  ctx: ParamsContext,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();

  const parsedBody = inventoryTransactionUpdateSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
  }

  const { id } = parsedParams.data;

  const { data, error } = await db
    .from("inventory_transactions")
    .update(parsedBody.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  ctx: ParamsContext,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Parameter ID tidak valid" },
      { status: 400 },
    );
  }

  const { id } = parsed.data;

  const { error } = await db
    .from("inventory_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Inventory transaction berhasil dihapus" },
    { status: 200 },
  );
}
