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
  block_id: z.string().uuid("Block ID tidak valid").optional(),

  harvest_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  total_bunches: z.coerce
    .number()
    .int("Jumlah janjang harus bilangan bulat")
    .min(0, "Jumlah janjang tidak boleh minus")
    .optional(),

  total_weight_kg: z.coerce
    .number()
    .min(0, "Total berat tidak boleh minus")
    .optional(),

  total_loose_fruit_kg: z.coerce
    .number()
    .min(0, "Brondolan tidak boleh minus")
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
      .from("harvests")
      .update({
        block_id: input.block_id,
        harvest_date: input.harvest_date,
        total_bunches: input.total_bunches,
        total_weight_kg: input.total_weight_kg,
        total_loose_fruit_kg: input.total_loose_fruit_kg,
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
  const { id } = await context.params;

  const parsedId = idSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await db.from("harvests").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Harvest berhasil dihapus" },
    { status: 200 },
  );
}
