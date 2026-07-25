import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  regionCreateSchema,
  type RegionCreateInput,
} from "@/lib/validators/region";

/* =========================
   GET ALL REGIONS (MASTER)
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("regions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE REGION
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = regionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: RegionCreateInput = parsed.data;

    const { data, error } = await db
      .from("regions")
      .insert(input)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
