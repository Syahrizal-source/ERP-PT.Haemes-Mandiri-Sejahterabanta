import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.tarif_sewa_internal !== undefined)
    validatePositive(body.tarif_sewa_internal, "Tarif Sewa");
  if (body.jam_operasi !== undefined)
    validatePositive(body.jam_operasi, "Jam Operasi");

  const { error } = await db
    .from("proyek_alat_berat")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Alat berat diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db
    .from("proyek_alat_berat")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Alat berat dihapus" });
}
