import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentMutationIdSchema,
  equipmentMutationUpdateSchema,
  type EquipmentMutationIdInput,
  type EquipmentMutationUpdateInput,
} from "@/lib/validators/alat-berat/equipment-mutation";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  const parsed = equipmentMutationIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentMutationIdInput = parsed.data;

  const { data, error } = await db
    .from("equipment_mutation")
    .select(
      `       id,
      equipment_id,
      tanggal,
      dari_lokasi,
      ke_lokasi,
      id_proyek,
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

  const parsed = equipmentMutationUpdateSchema.safeParse({
    ...body,
    id,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentMutationUpdateInput = parsed.data;

  const { id: recordId, ...updateData } = payload;

  const { data, error } = await db
    .from("equipment_mutation")
    .update(updateData)
    .eq("id", recordId)
    .select(
      `       id,
      equipment_id,
      tanggal,
      dari_lokasi,
      ke_lokasi,
      id_proyek,
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

  const parsed = equipmentMutationIdSchema.safeParse({ id });

  if (!parsed.success) {
    return NextResponse.json({ message: "INVALID_ID" }, { status: 400 });
  }

  const params: EquipmentMutationIdInput = parsed.data;

  const { error } = await db
    .from("equipment_mutation")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "DATA_DIHAPUS",
  });
}
