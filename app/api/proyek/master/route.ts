import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ProyekMaster } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

export async function GET() {
  const { data, error } = await db.from("proyek_master").select("*");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekMaster, "id"> = await req.json();
    validatePositive(body.nilai_kontrak, "Nilai Kontrak");

    const { error } = await db.from("proyek_master").insert(body);
    if (error) throw error;
    return NextResponse.json({ message: "Proyek dibuat" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
