import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db.rpc("report_neraca");
  if (error || !data) {
    return NextResponse.json({ error: "Gagal ambil neraca" }, { status: 500 });
  }
  return NextResponse.json(data);
}
