import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { blockSchema } from "@/lib/validators/block";
import { ZodError } from "zod";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("blocks")
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

    const parsed = blockSchema.parse(body);

    const { data, error } = await db
      .from("blocks")
      .insert({
        division_id: parsed.division_id,
        code: parsed.code,
        planting_year: parsed.planting_year,
        area_ha: parsed.area_ha,
        palm_population: parsed.palm_population,
        status: parsed.status,
        seed_type: parsed.seed_type,
        id_cost_center: parsed.id_cost_center ?? null,
        is_active: parsed.is_active ?? true,
      })
      .select()
      .single();
    console.log(parsed);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }

    console.error("BLOCK CREATE ERROR:", error);

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
