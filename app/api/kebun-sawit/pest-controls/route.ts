import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const pestControlSchema = z.object({
  block_id: z.string().uuid("Block ID tidak valid"),

  control_date: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine((value: string) => !isNaN(Date.parse(value)), {
      message: "Tanggal tidak valid",
    }),

  pest_type: z.string().min(1, "Jenis hama wajib diisi").max(100),

  severity_level: z.enum(["RINGAN", "SEDANG", "BERAT"]),

  action_taken: z.string().min(1).max(100),

  chemical_used: z.string().max(100).optional(),

  cost: z.coerce.number().min(0, "Biaya tidak boleh minus"),

  notes: z.string().max(500).optional(),
});

type PestControlInput = z.infer<typeof pestControlSchema>;

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pest_controls")
    .select("*")
    .order("control_date", { ascending: false });

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
    const parsed = pestControlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: PestControlInput = parsed.data;

    const { data, error } = await db
      .from("pest_controls")
      .insert({
        block_id: input.block_id,
        control_date: input.control_date,
        pest_type: input.pest_type,
        severity_level: input.severity_level,
        action_taken: input.action_taken,
        chemical_used: input.chemical_used ?? null,
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
