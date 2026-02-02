import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const divisionSchema = z.object({
  estate_id: z.string().uuid("Estate ID tidak valid"),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  area_ha: z.coerce.number().min(0, "Area tidak boleh minus"),
  is_active: z.boolean().optional(),
});

type DivisionInput = z.infer<typeof divisionSchema>;

/* =========================
   GET ALL DIVISIONS
========================= */

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

/* =========================
   POST CREATE DIVISION
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = divisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: DivisionInput = parsed.data;

    const { data, error } = await db
      .from("divisions")
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
