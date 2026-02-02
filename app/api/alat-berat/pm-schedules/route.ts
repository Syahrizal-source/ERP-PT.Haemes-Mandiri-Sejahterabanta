import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pmScheduleCreateSchema } from "@/lib/zod/pmSchedule.schema";

export async function GET() {
  const { data, error } = await db
    .from("pm_schedules")
    .select(
      `
      id,
      pm_type,
      last_hm,
      next_hm,
      equipment_id
    `,
    )
    .order("next_hm", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = pmScheduleCreateSchema.parse(body);

    const { data, error } = await db
      .from("pm_schedules")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
