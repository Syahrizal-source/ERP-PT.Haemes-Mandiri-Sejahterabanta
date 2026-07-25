import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  estateIdParamSchema,
  estateUpdateSchema,
  type EstateUpdateInput,
} from "@/lib/validators/estate";

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = estateIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const parsedBody = estateUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const input: EstateUpdateInput = parsedBody.data;

    const { data, error } = await db
      .from("estates")
      .update({
        region_id: input.region_id,
        code: input.code,
        name: input.name,
        total_area_ha: input.total_area_ha,
        manager_name: input.manager_name ?? null,
        is_active: input.is_active,
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
   DELETE
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = estateIdParamSchema.safeParse({ id });
  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.issues },
      { status: 400 },
    );
  }

  const { error } = await db.from("estates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Estate berhasil dihapus" },
    { status: 200 },
  );
}
