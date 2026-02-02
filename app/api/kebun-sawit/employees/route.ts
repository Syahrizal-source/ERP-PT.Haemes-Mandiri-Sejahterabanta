import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const employeeSchema = z.object({
  division_id: z.string().uuid("Division ID tidak valid").nullable().optional(),
  nik: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  position: z.enum(["MANDOR", "PEMANEN", "PEMUPUK", "PERAWATAN", "LAINNYA"]),
  npwp: z.string().max(30).optional(),
  ptkp_status: z.string().max(20).optional(),
  is_pph21_applicable: z.boolean().optional(),
  basic_salary: z.coerce
    .number()
    .min(0, "Gaji pokok tidak boleh minus")
    .optional(),
  is_active: z.boolean().optional(),
});

type EmployeeInput = z.infer<typeof employeeSchema>;

/* =========================
   GET ALL EMPLOYEES
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE EMPLOYEE
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: EmployeeInput = parsed.data;

    const { data, error } = await db
      .from("employees")
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
