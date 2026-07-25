import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentMutationCreateSchema,
  type EquipmentMutationCreateInput,
} from "@/lib/validators/alat-berat/equipment-mutation";

export async function GET(): Promise<Response> {
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
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();

  const parsed = equipmentMutationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentMutationCreateInput = parsed.data;

  const { data, error } = await db
    .from("equipment_mutation")
    .insert({
      equipment_id: payload.equipment_id,
      tanggal: payload.tanggal ?? null,
      dari_lokasi: payload.dari_lokasi ?? null,
      ke_lokasi: payload.ke_lokasi ?? null,
      id_proyek: payload.id_proyek ?? null,
    })
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

  return NextResponse.json(data, { status: 201 });
}
