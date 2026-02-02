import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { partCreateSchema } from "@/lib/zod/part.schema";

export async function GET() {
  const { data, error } = await db
    .from("parts")
    .select(
      `
      id,
      part_name,
      part_number,
      stock
    `,
    )
    .order("part_name", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = partCreateSchema.parse(body);

    const { data, error } = await db
      .from("parts")
      .insert(payload)
      .select(
        `
        id,
        part_name,
        part_number,
        stock
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
