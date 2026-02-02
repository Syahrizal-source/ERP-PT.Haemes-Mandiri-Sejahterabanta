import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const harvestSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),
  harvest_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal panen tidak valid",
    }),
  total_bunches: z.coerce
    .number()
    .int("Jumlah janjang harus angka bulat")
    .min(0, "Jumlah janjang tidak boleh minus"),
  total_weight_kg: z.coerce.number().min(0, "Total berat tidak boleh minus"),
  total_loose_fruit_kg: z.coerce.number().min(0, "Brondolan tidak boleh minus"),
  notes: z.string().optional(),
});

type HarvestInput = z.infer<typeof harvestSchema>;

/* =========================
   GET ALL HARVESTS
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("harvests")
    .select("*")
    .order("harvest_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE HARVEST
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = harvestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: HarvestInput = parsed.data;

    const { data, error } = await db
      .from("harvests")
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
