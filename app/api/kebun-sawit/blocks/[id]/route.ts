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
  division_id: z.string().uuid("Division ID tidak valid").optional(),

  code: z.string().min(1).max(20).optional(),

  planting_year: z.coerce
    .number()
    .int("Tahun tanam harus angka")
    .min(1900, "Tahun tanam tidak valid")
    .max(new Date().getFullYear(), "Tahun tanam tidak boleh di masa depan")
    .optional(),

  area_ha: z.coerce.number().min(0, "Luas tidak boleh minus").optional(),

  palm_population: z.coerce
    .number()
    .int("Populasi harus bilangan bulat")
    .min(0, "Populasi tidak boleh minus")
    .optional(),

  status: z.enum(["TBM", "TM", "REPLANTING"]).optional(),

  seed_type: z.string().max(100).optional(),

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
      .from("blocks")
      .update({
        division_id: input.division_id,
        code: input.code,
        planting_year: input.planting_year,
        area_ha: input.area_ha,
        palm_population: input.palm_population,
        status: input.status,
        seed_type: input.seed_type ?? null,
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

  const { error } = await db.from("blocks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Block berhasil dihapus" },
    { status: 200 },
  );
}
