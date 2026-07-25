import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RingkasanAlatBeratResponse = {
  total_equipment: number;
  total_operator: number;
  total_operation_jam: number;
  total_fuel: number;
  total_maintenance: number;
  total_breakdown: number;
  total_rental: number;
  total_depreciation: number;
};

function sumNumeric<T>(rows: T[] | null, field: keyof T): number {
  if (!rows || rows.length === 0) return 0;

  return rows.reduce((acc: number, row: T) => {
    const value = row[field];

    if (typeof value === "number") return acc + value;
    if (typeof value === "string") return acc + Number(value);

    return acc;
  }, 0);
}

export async function GET(req: NextRequest) {
  try {
    /* ======================
       FETCH DATA
    ====================== */

    const { data: equipment } = await db.from("equipment").select("id");

    const { data: operator } = await db.from("equipment_operator").select("id");

    const { data: operation } = await db
      .from("equipment_operation")
      .select("total_jam");

    const { data: fuel } = await db.from("equipment_fuel").select("total");

    const { data: maintenance } = await db
      .from("equipment_maintenance")
      .select("biaya");

    const { data: breakdown } = await db
      .from("equipment_breakdown")
      .select("id");

    const { data: rental } = await db.from("equipment_rental").select("total");

    const { data: depreciation } = await db
      .from("equipment_depreciation")
      .select("nilai");

    /* ======================
       HITUNG TOTAL
    ====================== */

    const total_equipment = equipment ? equipment.length : 0;
    const total_operator = operator ? operator.length : 0;

    const total_operation_jam = sumNumeric(operation, "total_jam");
    const total_fuel = sumNumeric(fuel, "total");
    const total_maintenance = sumNumeric(maintenance, "biaya");

    const total_breakdown = breakdown ? breakdown.length : 0;

    const total_rental = sumNumeric(rental, "total");
    const total_depreciation = sumNumeric(depreciation, "nilai");

    const response: RingkasanAlatBeratResponse = {
      total_equipment,
      total_operator,
      total_operation_jam,
      total_fuel,
      total_maintenance,
      total_breakdown,
      total_rental,
      total_depreciation,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
