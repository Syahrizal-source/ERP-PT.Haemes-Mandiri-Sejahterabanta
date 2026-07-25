import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentOperatorIdSchema,
  equipmentOperatorUpdateSchema,
  type EquipmentOperatorIdInput,
  type EquipmentOperatorUpdateInput,
} from "@/lib/validators/alat-berat/equipment-operator";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const parsed = equipmentOperatorIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentOperatorIdInput = parsed.data;

  const { data, error } = await db
    .from("equipment_operator")
    .select(
      `       id,
      nama,
      no_hp,
      sim,
      status,
      created_at
    `,
    )
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const body: unknown = await request.json();

  const parsed = equipmentOperatorUpdateSchema.safeParse({
    ...body,
    id,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentOperatorUpdateInput = parsed.data;

  const { id: recordId, ...updateData } = payload;

  const { data, error } = await db
    .from("equipment_operator")
    .update(updateData)
    .eq("id", recordId)
    .select(
      `       id,
      nama,
      no_hp,
      sim,
      status,
      created_at
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const parsed = equipmentOperatorIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentOperatorIdInput = parsed.data;

  const { error } = await db
    .from("equipment_operator")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "DATA_DIHAPUS",
  });
}
