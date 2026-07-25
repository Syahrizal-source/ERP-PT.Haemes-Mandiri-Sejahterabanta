import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { divisionSchema } from "@/lib/validators/divisions";
import { ZodError } from "zod";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("divisions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = divisionSchema.parse(body);

    const { data, error } = await db
      .from("divisions")
      .insert({
        estate_id: parsed.estate_id,
        code: parsed.code,
        name: parsed.name,
        area_ha: parsed.area_ha,
        is_active: parsed.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
