import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const replantingSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),

  activity_date: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine((value: string) => !isNaN(Date.parse(value)), {
      message: "Tanggal tidak valid",
    }),

  activity_type: z.enum(["TEBANG", "CHIPPING", "TANAM_ULANG", "BIBIT_MASUK"]),

  quantity: z.coerce
    .number()
    .int("Quantity harus bilangan bulat")
    .min(0, "Quantity tidak boleh minus")
    .optional(),

  cost: z.coerce.number().min(0, "Biaya tidak boleh minus"),

  notes: z.string().max(500).optional(),
});

type ReplantingInput = z.infer<typeof replantingSchema>;

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("replantings")
    .select("*")
    .order("activity_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const parsed = replantingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: ReplantingInput = parsed.data;

    const quantityValue: number | null =
      input.quantity !== undefined ? input.quantity : null;

    if (quantityValue !== null && quantityValue < 0) {
      return NextResponse.json(
        { message: "Quantity tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("replantings")
      .insert({
        block_id: input.block_id,
        activity_date: input.activity_date,
        activity_type: input.activity_type,
        quantity: quantityValue,
        cost: input.cost,
        notes: input.notes ?? null,
      })
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
