import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { regulasiPajakSchema } from "@/lib/validators/regulasi-pajak";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("regulasi_pajak")
    .select("*")
    .order("kode_pajak");

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil regulasi pajak" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json();
  const parsed = regulasiPajakSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("regulasi_pajak")
    .insert({ ...parsed.data, versi: 1, aktif: true })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
