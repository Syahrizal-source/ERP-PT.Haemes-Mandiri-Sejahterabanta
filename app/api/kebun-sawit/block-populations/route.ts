import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const blockPopulationSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),
  record_year: z.coerce
    .number()
    .int("Tahun harus angka bulat")
    .min(1900, "Tahun tidak valid")
    .max(new Date().getFullYear(), "Tahun tidak boleh di masa depan"),
  initial_population: z.coerce
    .number()
    .int()
    .min(0, "Populasi awal tidak boleh minus"),
  living_palms: z.coerce.number().int().min(0, "Pokok hidup tidak boleh minus"),
  dead_palms: z.coerce.number().int().min(0, "Pokok mati tidak boleh minus"),
  replanted_palms: z.coerce.number().int().min(0, "Sisipan tidak boleh minus"),
  notes: z.string().optional(),
});

type BlockPopulationInput = z.infer<typeof blockPopulationSchema>;

/* =========================
   GET ALL
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("block_populations")
    .select("*")
    .order("record_year", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = blockPopulationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: BlockPopulationInput = parsed.data;

    const { data, error } = await db
      .from("block_populations")
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
