import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentOperationIdSchema,
  equipmentOperationUpdateSchema,
  type EquipmentOperationIdInput,
  type EquipmentOperationUpdateInput,
} from "@/lib/validators/alat-berat/equipment-operation";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const parsed = equipmentOperationIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentOperationIdInput = parsed.data;

  const { data, error } = await db
    .from("equipment_operation")
    .select("*")
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
  const bodyRecord =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? body
      : {};

  const parsed = equipmentOperationUpdateSchema.safeParse({
    ...bodyRecord,
    id,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentOperationUpdateInput = parsed.data;

  const { id: recordId, ...updateData } = payload;

  const { data, error } = await db
    .from("equipment_operation")
    .update(updateData)
    .eq("id", recordId)
    .select("*")
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

  const parsed = equipmentOperationIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentOperationIdInput = parsed.data;

  const { error } = await db
    .from("equipment_operation")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "DATA_DIHAPUS" });
}
