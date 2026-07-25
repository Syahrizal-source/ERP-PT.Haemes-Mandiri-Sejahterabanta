import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validatePositive } from "@/lib/validator";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.nilai_kontrak !== undefined) {
      validatePositive(body.nilai_kontrak, "Nilai Kontrak");
    }

    if (body.margin_target !== undefined) {
      validatePositive(body.margin_target, "Margin Target");
    }

    const { error } = await db.from("proyek_master").update(body).eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Proyek diupdate" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { error } = await db.from("proyek_master").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Proyek dihapus" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
