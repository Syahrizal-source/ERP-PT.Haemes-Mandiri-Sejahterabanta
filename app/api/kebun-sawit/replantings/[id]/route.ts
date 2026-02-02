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
  activity_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  activity_type: z
    .enum(["TEBANG", "CHIPPING", "TANAM_ULANG", "BIBIT_MASUK"])
    .optional(),

  quantity: z.coerce
    .number()
    .int("Quantity harus bilangan bulat")
    .min(0, "Quantity tidak boleh minus")
    .optional(),

  cost: z.coerce.number().min(0, "Biaya tidak boleh minus").optional(),

  notes: z.string().max(500).optional(),
});

type UpdateInput = z.infer<typeof updateSchema>;

/* =========================
   PUT
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
      .from("replantings")
      .update({
        activity_date: input.activity_date,
        activity_type: input.activity_type,
        quantity: input.quantity,
        cost: input.cost,
        notes: input.notes ?? null,
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

  const { error } = await db.from("replantings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Data berhasil dihapus" },
    { status: 200 },
  );
}
