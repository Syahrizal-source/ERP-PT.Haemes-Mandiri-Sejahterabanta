import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  equipmentCreateSchema,
  type EquipmentCreateInput,
} from "@/lib/validators/alat-berat/equipment";

export async function GET(): Promise<Response> {
  const { data, error } = await db
    .from("equipment")
    .select(
      "id,asset_number,type,brand,model,serial_number,year,site_id,status,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json();

  const parsed = equipmentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "VALIDATION_ERROR" }, { status: 400 });
  }

  const payload: EquipmentCreateInput = parsed.data;

  const { data, error } = await db
    .from("equipment")
    .insert({
      asset_number: payload.asset_number,
      type: payload.type,
      brand: payload.brand,
      model: payload.model ?? null,
      serial_number: payload.serial_number ?? null,
      year: payload.year ?? null,
      site_id: payload.site_id ?? null,
      status: payload.status ?? "ACTIVE",
    })
    .select(
      "id,asset_number,type,brand,model,serial_number,year,site_id,status,created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
