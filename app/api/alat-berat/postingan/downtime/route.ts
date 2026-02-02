import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

const downtimeCreateSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  downtime_type: z.enum(["MECHANICAL", "OPERATIONAL", "WAITING_PART"]),
  reason: z.string().optional(),
  hourly_cost: z.coerce.number().nonnegative(),
  equipment_id: z.string().uuid(),
});

type DowntimePayload = z.infer<typeof downtimeCreateSchema>;

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const payload: DowntimePayload = downtimeCreateSchema.parse(body);

    const { data, error } = await db
      .from("downtime_logs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Trigger database akan otomatis:
    // - Hitung duration_hours
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
