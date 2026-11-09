import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentIdSchema,
  equipmentUpdateSchema,
  type EquipmentIdInput,
  type EquipmentUpdateInput,
} from "@/lib/validators/alat-berat/equipment";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const parsed = equipmentIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentIdInput = parsed.data;

  const { data, error } = await db
    .from("equipment")
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

  const parsed = equipmentUpdateSchema.safeParse({
    ...bodyRecord,
    id,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentUpdateInput = parsed.data;

  const { id: recordId, ...updateData } = payload;

  const { data, error } = await db
    .from("equipment")
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

  const parsed = equipmentIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentIdInput = parsed.data;

  const { error } = await db.from("equipment").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "DATA_DIHAPUS" });
}
