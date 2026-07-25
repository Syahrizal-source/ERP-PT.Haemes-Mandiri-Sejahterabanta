import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.upah !== undefined) {
      validatePositive(body.upah, "Upah");
    }

    const { error } = await db
      .from("proyek_tenaga_kerja")
      .update(body)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Tenaga kerja diupdate" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  const { id } = await context.params;

  const { error } = await db.from("proyek_tenaga_kerja").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Tenaga kerja dihapus" });
}
