import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { mechanicCreateSchema } from "@/lib/zod/mechanic.schema";

export async function GET() {
  const { data, error } = await db
    .from("mechanics")
    .select(
      `
      id,
      name,
      employee_id,
      ppn,
      pph21,
      pph23,
      pph4,
      is_active
    `,
    )
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = mechanicCreateSchema.parse(body);

    const { data, error } = await db
      .from("mechanics")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
