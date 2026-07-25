import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  employeeUpdateSchema,
  employeeParamSchema,
  EmployeeUpdateInput,
} from "@/lib/validators/employees";

/* =========================
   UPDATE EMPLOYEE
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const parsedId = employeeParamSchema.safeParse({ id });

    if (!parsedId.success) {
      return NextResponse.json(
        { errors: parsedId.error.issues },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();

    const parsedBody = employeeUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.issues },
        { status: 400 },
      );
    }

    const input: EmployeeUpdateInput = parsedBody.data;

    const { data, error } = await db
      .from("employees")
      .update({
        nik: input.nik,
        name: input.name,
        position: input.position,
        division_id: input.division_id,
        hire_date: input.hire_date,
        basic_salary: input.basic_salary,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}

/* =========================
   DELETE EMPLOYEE
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = employeeParamSchema.safeParse({ id });

  if (!parsedId.success) {
    return NextResponse.json(
      { errors: parsedId.error.issues },
      { status: 400 },
    );
  }

  const { error } = await db.from("employees").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Employee berhasil dihapus" },
    { status: 200 },
  );
}
