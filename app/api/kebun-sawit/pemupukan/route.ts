import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const PemupukanSchema = z.object({
  tanggal: z.string().min(1),
  id_blok: z.string().uuid(),
  jenis_pupuk: z.string().min(1).max(100),
  dosis_per_ha: z.coerce.number().nonnegative(),
  biaya: z.coerce.number().nonnegative(),
  pelaksana: z.string().max(100).optional(),
});

type PemupukanInput = z.infer<typeof PemupukanSchema>;

/* =======================
   GET ALL PEMUPUKAN
======================= */
export async function GET() {
  const { data, error } = await db
    .from("pemupukan")
    .select(
      `
      *,
      master_blok (
        id_blok,
        kode_blok,
        luas_blok_ha
      )
    `,
    )
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   CREATE PEMUPUKAN
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = PemupukanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: PemupukanInput = parsed.data;

  /* =======================
     HITUNG TOTAL PUPUK
     total = dosis_per_ha * luas_blok
     (ANTI MINUS & AMAN)
  ======================= */
  const { data: blok, error: blokError } = await db
    .from("master_blok")
    .select("luas_blok_ha")
    .eq("id_blok", input.id_blok)
    .single();

  if (blokError || !blok?.luas_blok_ha || blok.luas_blok_ha <= 0) {
    return NextResponse.json(
      { error: "Luas blok tidak valid" },
      { status: 400 },
    );
  }

  const total_pupuk_kg = input.dosis_per_ha * Number(blok.luas_blok_ha);

  const { data, error } = await db
    .from("pemupukan")
    .insert({
      ...input,
      total_pupuk_kg,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
