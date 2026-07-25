import { db } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ProyekMaster } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

/**
 * GET ALL PROYEK
 */
export async function GET() {
  const { data, error } = await db
    .from("proyek_master")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * CREATE PROYEK
 * return: { id: UUID }
 */
export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekMaster, "id"> = await req.json();

    // VALIDASI AMAN
    validatePositive(body.nilai_kontrak, "Nilai Kontrak");

    const { data, error } = await db
      .from("proyek_master")
      .insert(body)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    // 🔥 PENTING: return ID untuk redirect ke RAB
    return NextResponse.json({ id: data.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
