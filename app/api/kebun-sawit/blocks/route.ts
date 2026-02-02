import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const blockSchema = z.object({
  division_id: z.string().uuid("Division ID tidak valid"),
  code: z.string().min(1).max(20),
  planting_year: z.coerce
    .number()
    .int("Tahun tanam harus angka bulat")
    .min(1900, "Tahun tanam tidak valid")
    .max(new Date().getFullYear(), "Tahun tanam tidak boleh di masa depan")
    .optional(),
  area_ha: z.coerce.number().min(0, "Area tidak boleh minus"),
  palm_population: z.coerce
    .number()
    .int("Populasi harus angka bulat")
    .min(0, "Populasi tidak boleh minus"),
  status: z.enum(["TBM", "TM", "REPLANTING"]),
  seed_type: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

type BlockInput = z.infer<typeof blockSchema>;

/* =========================
   GET ALL BLOCKS
========================= */

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

/* =========================
   POST CREATE BLOCK
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = blockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: BlockInput = parsed.data;

    const { data, error } = await db
      .from("blocks")
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
