import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();
  if (body.target_volume !== undefined)
    validatePositive(body.target_volume, "Target Volume");
  if (body.realisasi_volume !== undefined)
    validatePositive(body.realisasi_volume, "Realisasi Volume");

  const { error } = await db
    .from("proyek_progress")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Progress diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db
    .from("proyek_progress")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Progress dihapus" });
}
