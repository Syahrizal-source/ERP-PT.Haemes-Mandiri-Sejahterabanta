import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.volume !== undefined) validatePositive(body.volume, "Volume");
  if (body.harga_satuan !== undefined)
    validatePositive(body.harga_satuan, "Harga");

  const { error } = await db
    .from("proyek_rab")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "RAB diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db.from("proyek_rab").delete().eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "RAB dihapus" });
}
