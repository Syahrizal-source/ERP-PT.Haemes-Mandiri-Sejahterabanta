import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekPenerimaan } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idTagihan = searchParams.get("id_tagihan");

  let query = db.from("proyek_penerimaan").select("*");

  if (idTagihan) {
    query = query.eq("id_tagihan", idTagihan);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekPenerimaan, "id"> = await req.json();
    validatePositive(body.jumlah, "Jumlah");

    const { error } = await db.from("proyek_penerimaan").insert(body);
    if (error) throw error;

    return NextResponse.json({ message: "Penerimaan ditambahkan" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
