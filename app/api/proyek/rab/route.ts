import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekRAB } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

/**
 * GET RAB
 * Bisa:
 * 1. Semua RAB
 * 2. Filter per proyek: ?id_proyek=UUID
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idProyek = searchParams.get("id_proyek");

  let query = db.from("proyek_rab").select("*");

  if (idProyek) {
    query = query.eq("id_proyek", idProyek);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST RAB
 */
export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekRAB, "id"> = await req.json();

    validatePositive(body.volume, "Volume");
    validatePositive(body.harga_satuan, "Harga Satuan");

    const { error } = await db.from("proyek_rab").insert(body);
    if (error) throw error;

    return NextResponse.json({ message: "RAB ditambahkan" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
