import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("periode")
    .select("*")
    .eq("status", "OPEN")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Periode aktif tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
