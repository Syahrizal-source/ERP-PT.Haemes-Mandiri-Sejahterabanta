import { db } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idPeriode = searchParams.get("id_periode");

  const { data, error } = await db.rpc("fn_neraca_periode", { pid: idPeriode });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
