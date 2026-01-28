import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import { ProyekCostControl } from "@/types/proyek";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idRab = searchParams.get("id_rab");

  let query = db.from("proyek_cost_control").select("*");

  if (idRab) {
    query = query.eq("id_rab", idRab);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekCostControl, "id"> = await req.json();
    validatePositive(body.biaya_realisasi, "Biaya Realisasi");

    const { error } = await db.from("proyek_cost_control").insert(body);
    if (error) throw error;

    return NextResponse.json({ message: "Cost Control ditambahkan" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
