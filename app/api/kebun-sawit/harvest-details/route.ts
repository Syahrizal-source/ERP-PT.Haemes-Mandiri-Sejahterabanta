import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const harvestDetailSchema = z.object({
  harvest_id: z.string().uuid("Harvest ID tidak valid"),
  harvester_name: z.string().min(1).max(100),
  bunches: z.coerce
    .number()
    .int("Jumlah janjang harus angka bulat")
    .min(0, "Jumlah janjang tidak boleh minus"),
  weight_kg: z.coerce.number().min(0, "Berat tidak boleh minus"),
  loose_fruit_kg: z.coerce.number().min(0, "Brondolan tidak boleh minus"),
});

type HarvestDetailInput = z.infer<typeof harvestDetailSchema>;

/* =========================
   GET ALL HARVEST DETAILS
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("harvest_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE HARVEST DETAIL
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = harvestDetailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: HarvestDetailInput = parsed.data;

    const { data, error } = await db
      .from("harvest_details")
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
