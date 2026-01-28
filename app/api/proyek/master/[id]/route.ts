import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    if (body.nilai_kontrak !== undefined)
      validatePositive(body.nilai_kontrak, "Nilai Kontrak");

    const { error } = await db
      .from("proyek_master")
      .update(body)
      .eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ message: "Proyek diupdate" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db.from("proyek_master").delete().eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Proyek dihapus" });
}
