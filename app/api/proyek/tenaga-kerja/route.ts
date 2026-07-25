import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import { ProyekTenagaKerja } from "@/types/proyek";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idProyek = searchParams.get("id_proyek");

  if (!idProyek) {
    return NextResponse.json(
      { error: "id_proyek wajib diisi" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("proyek_tenaga_kerja")
    .select("*")
    .eq("id_proyek", idProyek)
    .order("nama");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekTenagaKerja, "id"> = await req.json();

    validatePositive(body.upah, "Upah");

    const { error } = await db.from("proyek_tenaga_kerja").insert(body);

    if (error) throw error;

    return NextResponse.json({ message: "Tenaga kerja ditambahkan" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
