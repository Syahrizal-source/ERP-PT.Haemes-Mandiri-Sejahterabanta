import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

const dailyOperationSchema = z.object({
  operation_date: z.string(),
  working_hours: z.coerce.number().positive(),
  production: z.coerce.number().nonnegative(),
  fuel_consumption: z.coerce.number().nonnegative(),
  hourly_rate: z.coerce.number().nonnegative(),
  equipment_id: z.string().uuid(),
  operator_id: z.string().uuid(),
});

type DailyOperationPayload = z.infer<typeof dailyOperationSchema>;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload: DailyOperationPayload = dailyOperationSchema.parse(body);

    const { data, error } = await db
      .from("daily_operations")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Trigger database akan otomatis:
    // - Hitung total_cost
    // - Posting jurnal

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unknown error" }, { status: 500 });
  }
}
