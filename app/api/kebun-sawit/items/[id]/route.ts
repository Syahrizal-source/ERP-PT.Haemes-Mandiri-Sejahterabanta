import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  itemUpdateSchema,
  itemParamSchema,
  ItemUpdateInput,
} from "@/lib/validators/items";

/* =========================
   GET DETAIL ITEM
========================= */

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = itemParamSchema.safeParse({ id });

    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Gagal mengambil data item" },
      { status: 500 },
    );
  }
}

/* =========================
   UPDATE ITEM
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = itemParamSchema.safeParse({ id });

    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();

    const parsedBody = itemUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const input: ItemUpdateInput = parsedBody.data;

    const { data, error } = await db
      .from("items")
      .update({
        name: input.name,
        category: input.category ?? null,
        unit: input.unit,
        minimum_stock: input.minimum_stock,
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
   DELETE ITEM
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = itemParamSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.issues },
      { status: 400 },
    );
  }

  const { error } = await db.from("items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Item berhasil dihapus" },
    { status: 200 },
  );
}
