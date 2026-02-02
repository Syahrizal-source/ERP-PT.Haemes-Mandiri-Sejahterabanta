import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const itemSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100),
  category: z.string().max(50).optional(),
  unit: z.string().min(1, "Satuan wajib diisi").max(20),
  minimum_stock: z.coerce.number().min(0, "Minimum stok tidak boleh minus"),
});

type ItemInput = z.infer<typeof itemSchema>;

/* =========================
   GET ALL ITEMS
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE ITEM
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = itemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: ItemInput = parsed.data;

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
