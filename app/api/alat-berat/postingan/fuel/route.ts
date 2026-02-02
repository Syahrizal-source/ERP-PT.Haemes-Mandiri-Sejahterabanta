import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

const fuelCreateSchema = z.object({
  fuel_date: z.string(), // format YYYY-MM-DD
  fuel_liter: z.coerce.number().positive(),
  harga_per_liter: z.coerce.number().positive(),
  equipment_id: z.string().uuid(),
});

type FuelPayload = z.infer<typeof fuelCreateSchema>;

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json();
    const payload: FuelPayload = fuelCreateSchema.parse(body);

    // ⛔ Tidak menghitung total_biaya di sini
    // Database yang akan menghitung otomatis

    const { data, error } = await db
      .from("fuel_logs")
      .insert({
        fuel_date: payload.fuel_date,
        fuel_liter: payload.fuel_liter,
        harga_per_liter: payload.harga_per_liter,
        equipment_id: payload.equipment_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", issues: err.issues },
        { status: 400 },
      );
    }

    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
