import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { fuelLogCreateSchema } from "@/lib/zod/fuelLog.schema";

export async function GET() {
  const { data, error } = await db
    .from("fuel_logs")
    .select(
      `
      id,
      fuel_date,
      fuel_liter,
      equipment_id
    `,
    )
    .order("fuel_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = fuelLogCreateSchema.parse(body);

    const { data, error } = await db
      .from("fuel_logs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // ⛔ jurnal tetap ditangani trigger DB
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
