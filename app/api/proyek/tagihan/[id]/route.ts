import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.nilai !== undefined) validatePositive(body.nilai, "Nilai Tagihan");

  const { error } = await db
    .from("proyek_tagihan")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Tagihan diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db
    .from("proyek_tagihan")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Tagihan dihapus" });
}
