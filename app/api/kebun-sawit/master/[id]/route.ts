import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  regionIdParamSchema,
  regionUpdateSchema,
  type RegionUpdateInput,
} from "@/lib/validators/region";

/* =========================
   PUT (UPDATE REGION)
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = regionIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const parsedBody = regionUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const input: RegionUpdateInput = parsedBody.data;

    const { data, error } = await db
      .from("regions")
      .update({
        province_id: input.province_id,
        name: input.name,
        updated_at: new Date().toISOString(),
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
   DELETE REGION
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = regionIdParamSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.issues },
      { status: 400 },
    );
  }

  const { error } = await db.from("regions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Region berhasil dihapus" },
    { status: 200 },
  );
}
