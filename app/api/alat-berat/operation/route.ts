import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentOperationCreateSchema,
  type EquipmentOperationCreateInput,
} from "@/lib/validators/alat-berat/equipment-operation";

export async function GET(): Promise<Response> {
  const { data, error } = await db
    .from("equipment_operation")
    .select(
      `       id,
      equipment_id,
      tanggal,
      id_operator,
      id_proyek,
      hm_awal,
      hm_akhir,
      total_jam,
      keterangan,
      created_at
    `,
    )
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();

  const parsed = equipmentOperationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentOperationCreateInput = parsed.data;

  const totalJam =
    payload.hm_awal !== undefined && payload.hm_akhir !== undefined
      ? payload.hm_akhir - payload.hm_awal
      : (payload.total_jam ?? null);

  const { data, error } = await db
    .from("equipment_operation")
    .insert({
      equipment_id: payload.equipment_id,
      tanggal: payload.tanggal,
      id_operator: payload.id_operator ?? null,
      id_proyek: payload.id_proyek ?? null,
      hm_awal: payload.hm_awal ?? null,
      hm_akhir: payload.hm_akhir ?? null,
      total_jam: totalJam,
      keterangan: payload.keterangan ?? null,
    })
    .select(
      `       id,
      equipment_id,
      tanggal,
      id_operator,
      id_proyek,
      hm_awal,
      hm_akhir,
      total_jam,
      keterangan,
      created_at
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
