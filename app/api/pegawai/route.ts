import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pegawaiSchema, PegawaiInput } from "@/lib/validators/pegawai";

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db.from("pegawai").select("*").order("nama");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/* =========================
   POST
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = pegawaiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PegawaiInput = parsed.data;

    const { data, error } = await db
      .from("pegawai")
      .insert(input)
      .select()
      .single();

    if (error || !data) {
      throw error;
    }

    return NextResponse.json({
      message: "Pegawai berhasil ditambahkan",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
