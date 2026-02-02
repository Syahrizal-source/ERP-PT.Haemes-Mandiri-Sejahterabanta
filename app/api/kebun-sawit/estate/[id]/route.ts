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
  region_id: z.string().uuid("Region ID tidak valid").optional(),
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  total_area_ha: z.coerce.number().min(0, "Luas tidak boleh minus").optional(),
  manager_name: z.string().max(100).optional(),
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

  const parsedId = idSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.flatten() },
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
