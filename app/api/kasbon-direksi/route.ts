import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonDireksiSchema } from "@/lib/validators/kasbon";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kasbon_direksi")
    .select("*")
    .order("tanggal", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = kasbonDireksiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { error } = await db.from("kasbon_direksi").insert(parsed.data);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "OK" }, { status: 201 });
}
