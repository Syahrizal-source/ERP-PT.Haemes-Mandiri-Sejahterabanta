import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json();

  if (body.biaya_realisasi !== undefined) {
    validatePositive(body.biaya_realisasi, "Biaya Realisasi");
  }

  const { error } = await db
    .from("proyek_cost_control")
    .update(body)
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Cost Control diupdate" });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { error } = await db
    .from("proyek_cost_control")
    .delete()
    .eq("id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Cost Control dihapus" });
}
