import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  employeeCreateSchema,
  EmployeeCreateInput,
} from "@/lib/validators/employees";

/* =========================
   GET EMPLOYEES
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
   CREATE EMPLOYEE
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = employeeCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: EmployeeCreateInput = parsed.data;

    const { data, error } = await db
      .from("employees")
      .insert({
        nik: input.nik,
        name: input.name,
        position: input.position,
        division_id: input.division_id,
        hire_date: input.hire_date,
        basic_salary: input.basic_salary,
        is_active: input.is_active ?? true,
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
