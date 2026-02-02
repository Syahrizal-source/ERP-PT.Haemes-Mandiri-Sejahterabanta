import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { inspectionCreateSchema } from "@/lib/zod/inspection.schema";

export async function GET() {
  const { data, error } = await db
    .from("inspections")
    .select(
      `
      id,
      inspection_date,
      inspection_type,
      note,
      equipment_id
    `,
    )
    .order("inspection_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = inspectionCreateSchema.parse(body);

    const { data, error } = await db
      .from("inspections")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
