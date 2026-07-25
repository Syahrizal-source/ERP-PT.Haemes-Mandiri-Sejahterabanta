import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentBreakdownCreateSchema,
  type EquipmentBreakdownCreateInput,
} from "@/lib/validators/alat-berat/equipment-breakdown";

export async function GET(): Promise<Response> {
  const { data, error } = await db
    .from("equipment_breakdown")
    .select(
      `       id,
      equipment_id,
      tanggal_mulai,
      tanggal_selesai,
      penyebab,
      tindakan,
      durasi_jam,
      id_operator,
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

  const parsed = equipmentBreakdownCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentBreakdownCreateInput = parsed.data;

  const { data, error } = await db
    .from("equipment_breakdown")
    .insert({
      equipment_id: payload.equipment_id,
      tanggal_mulai: payload.tanggal_mulai,
      tanggal_selesai: payload.tanggal_selesai ?? null,
      penyebab: payload.penyebab ?? null,
      tindakan: payload.tindakan ?? null,
      durasi_jam: payload.durasi_jam ?? null,
      id_operator: payload.id_operator ?? null,
      id_proyek: payload.id_proyek ?? null,
    })
    .select(
      `       id,
      equipment_id,
      tanggal_mulai,
      tanggal_selesai,
      penyebab,
      tindakan,
      durasi_jam,
      id_operator,
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
