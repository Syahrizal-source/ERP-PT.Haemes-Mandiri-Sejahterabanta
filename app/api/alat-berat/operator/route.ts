import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentOperatorCreateSchema,
  type EquipmentOperatorCreateInput,
} from "@/lib/validators/alat-berat/equipment-operator";

export async function GET(): Promise<Response> {
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
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();

  const parsed = equipmentOperatorCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentOperatorCreateInput = parsed.data;

  const { data, error } = await db
    .from("equipment_operator")
    .insert({
      nama: payload.nama,
      no_hp: payload.no_hp ?? null,
      sim: payload.sim ?? null,
      status: payload.status ?? "AKTIF",
    })
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

  return NextResponse.json(data, { status: 201 });
}
