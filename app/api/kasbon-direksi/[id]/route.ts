import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonDireksiSchema } from "@/lib/validators/kasbon";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;

  const body: unknown = await req.json();
  const parsed = kasbonDireksiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { error } = await db
    .from("kasbon_direksi")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;

  const { error } = await db.from("kasbon_direksi").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" });
}
