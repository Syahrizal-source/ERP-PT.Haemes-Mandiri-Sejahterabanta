import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Params = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const idAdj = Number(id);

  if (!Number.isInteger(idAdj)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { data, error } = await db
    .from("jurnal_penyesuaian")
    .select("*")
    .eq("id", idAdj)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}
