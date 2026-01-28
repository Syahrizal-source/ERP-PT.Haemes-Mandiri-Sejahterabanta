import { db } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idPeriode = searchParams.get("id_periode");

  const query = db.from("v_laba_rugi").select("*");
  if (idPeriode) query.eq("id_periode", idPeriode);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
