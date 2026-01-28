import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekProgress } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idProyek = searchParams.get("id_proyek");

  let query = db.from("proyek_progress").select("*");

  if (idProyek) {
    query = query.eq("id_proyek", idProyek);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekProgress, "id"> = await req.json();
    validatePositive(body.target_volume, "Target Volume");
    validatePositive(body.realisasi_volume, "Realisasi Volume");

    const { error } = await db.from("proyek_progress").insert(body);
    if (error) throw error;

    return NextResponse.json({ message: "Progress ditambahkan" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
