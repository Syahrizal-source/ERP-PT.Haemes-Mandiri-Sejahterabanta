import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { dailyCheckCreateSchema } from "@/lib/zod/dailyCheck.schema";

export async function GET() {
  const { data, error } = await db
    .from("daily_checks")
    .select(
      `
      id,
      check_date,
      hm_start,
      hm_end,
      equipment_id,
      operator_id
    `,
    )
    .order("check_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = dailyCheckCreateSchema.parse(body);

    const { data, error } = await db
      .from("daily_checks")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
