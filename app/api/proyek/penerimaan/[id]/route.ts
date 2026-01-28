import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.jumlah !== undefined) validatePositive(body.jumlah, "Jumlah");

  const { error } = await db
    .from("proyek_penerimaan")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Penerimaan diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db
    .from("proyek_penerimaan")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Penerimaan dihapus" });
}
