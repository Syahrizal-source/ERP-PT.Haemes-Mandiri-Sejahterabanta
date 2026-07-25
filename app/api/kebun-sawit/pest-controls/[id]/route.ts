import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  PestControlUpdateSchema,
  PestControlUpdateInput,
} from "@/lib/validators/pest-controls";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET
========================= */
export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params; // ✅ FIX

  const { data, error } = await db
    .from("pest_controls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   PUT
========================= */
export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params; // ✅ FIX WAJIB

    const json: unknown = await req.json();

    const payload: PestControlUpdateInput = PestControlUpdateSchema.parse(json);

    const { error } = await db
      .from("pest_controls")
      .update(payload)
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      message: "Pest control berhasil diperbarui",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 400 });
  }
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;

  const { error } = await db.from("pest_controls").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Pest control berhasil dihapus",
  });
}
