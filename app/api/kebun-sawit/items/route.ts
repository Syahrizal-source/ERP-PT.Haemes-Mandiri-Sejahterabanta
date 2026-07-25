import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import { itemCreateSchema, ItemCreateInput } from "@/lib/validators/items";

/* =========================
   GET ITEMS
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("items")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   CREATE ITEM
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = itemCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: ItemCreateInput = parsed.data;

    const { data, error } = await db
      .from("items")
      .insert({
        name: input.name,
        category: input.category ?? null,
        unit: input.unit,
        minimum_stock: input.minimum_stock,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
