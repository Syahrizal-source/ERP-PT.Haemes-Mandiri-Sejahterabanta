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
  block_id: z.string().uuid("Block ID tidak valid").optional(),

  record_year: z.coerce
    .number()
    .int("Tahun harus bilangan bulat")
    .min(1900, "Tahun tidak valid")
    .max(new Date().getFullYear(), "Tahun tidak boleh di masa depan")
    .optional(),

  initial_population: z.coerce
    .number()
    .int("Populasi awal harus bilangan bulat")
    .min(0, "Populasi awal tidak boleh minus")
    .optional(),

  living_palms: z.coerce
    .number()
    .int("Pokok hidup harus bilangan bulat")
    .min(0, "Pokok hidup tidak boleh minus")
    .optional(),

  dead_palms: z.coerce
    .number()
    .int("Pokok mati harus bilangan bulat")
    .min(0, "Pokok mati tidak boleh minus")
    .optional(),

  replanted_palms: z.coerce
    .number()
    .int("Sisipan harus bilangan bulat")
    .min(0, "Sisipan tidak boleh minus")
    .optional(),

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

    /* ===== Anti Logic Validation ===== */
    if (
      input.initial_population !== undefined &&
      input.living_palms !== undefined &&
      input.living_palms > input.initial_population
    ) {
      return NextResponse.json(
        { message: "Pokok hidup tidak boleh melebihi populasi awal" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("block_populations")
      .update({
        block_id: input.block_id,
        record_year: input.record_year,
        initial_population: input.initial_population,
        living_palms: input.living_palms,
        dead_palms: input.dead_palms,
        replanted_palms: input.replanted_palms,
        notes: input.notes ?? null,
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
  const params = await context.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { errors: parsedParams.error.flatten() },
      { status: 400 },
    );
  }

  const id: string = parsedParams.data.id;

  const { error } = await db.from("block_populations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Block population berhasil dihapus" },
    { status: 200 },
  );
}
