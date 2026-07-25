import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  replantingUpdateSchema,
  replantingParamSchema,
  ReplantingUpdateInput,
} from "@/lib/validators/replantings";

/* =========================
   UPDATE REPLANTING
========================= */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = replantingParamSchema.safeParse({ id });

    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();

    const parsed = replantingUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: ReplantingUpdateInput = parsed.data;

    const { data, error } = await db
      .from("replantings")
      .update({
        block_id: input.block_id,
        tanggal: input.tanggal,
        pokok_ditebang: input.pokok_ditebang,
        pokok_ditanam: input.pokok_ditanam,
        biaya_total: input.biaya_total,
        keterangan: input.keterangan ?? null,
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
   DELETE REPLANTING
========================= */

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = replantingParamSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.issues },
      { status: 400 },
    );
  }

  const { error } = await db.from("replantings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Replanting berhasil dihapus" },
    { status: 200 },
  );
}
