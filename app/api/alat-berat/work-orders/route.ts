import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { workOrderCreateSchema } from "@/lib/zod/workOrder.schema";

export async function GET() {
  const { data, error } = await db
    .from("work_orders")
    .select(
      `
      id,
      wo_number,
      job_type,
      complaint,
      start_time,
      end_time,
      status,
      equipment_id,
      mechanic_id
    `,
    )
    .order("start_time", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload = workOrderCreateSchema.parse(body);

    const { data, error } = await db
      .from("work_orders")
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
