import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { armadaSchema } from "@/lib/validators/armada";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  const parsed = armadaSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.format(), { status: 400 });

  const payload = { ...parsed.data, "m³": parsed.data.m3 };
  delete (payload as { m3?: number }).m3;

  const { error } = await db
    .from("armada")
    .update(payload)
    .eq("id", Number(id));
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const { error } = await db.from("armada").delete().eq("id", Number(id));
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
