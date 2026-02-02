import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   PARAM VALIDATION
========================= */

const idSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

/* =========================
   UPDATE SCHEMA
========================= */

const updateSchema = z.object({
  estate_id: z.string().uuid("Estate ID tidak valid").optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  area_ha: z.coerce.number().min(0, "Luas tidak boleh minus").optional(),
  is_active: z.boolean().optional(),
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
    const { id } = await context.params;

    const parsedId = idSchema.safeParse({ id });

    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.flatten() },
        { status: 400 },
      );
    }

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
      .from("divisions")
      .update({
        estate_id: input.estate_id,
        code: input.code,
        name: input.name,
        area_ha: input.area_ha,
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

  const parsedId = idSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await db.from("divisions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Division berhasil dihapus" },
    { status: 200 },
  );
}
