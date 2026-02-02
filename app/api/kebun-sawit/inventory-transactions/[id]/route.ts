import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   PARAM VALIDATION
========================= */

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

/* =========================
   UPDATE SCHEMA
========================= */

const updateSchema = z.object({
  item_id: z.string().uuid("Item ID tidak valid").optional(),

  block_id: z.string().uuid("Block ID tidak valid").optional(),

  transaction_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  transaction_type: z.enum(["IN", "OUT"]).optional(),

  quantity: z.coerce
    .number()
    .min(0.0001, "Quantity harus lebih dari 0")
    .optional(),

  reference_module: z.string().max(50).optional(),

  notes: z.string().max(500).optional(),
});

type UpdateInput = z.infer<typeof updateSchema>;

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const id: string = parsedParams.data.id;

    const body: unknown = await request.json();
    const parsedBody = updateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const input: UpdateInput = parsedBody.data;

    const { data, error } = await db
      .from("inventory_transactions")
      .update({
        item_id: input.item_id,
        block_id: input.block_id ?? null,
        transaction_date: input.transaction_date,
        transaction_type: input.transaction_type,
        quantity: input.quantity,
        reference_module: input.reference_module ?? null,
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { errors: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const id: string = parsedParams.data.id;

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
