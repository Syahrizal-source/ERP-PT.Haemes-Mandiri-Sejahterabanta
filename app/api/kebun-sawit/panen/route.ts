import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const PanenSchema = z.object({
  tanggal_panen: z.string().min(1), // ISO date
  id_blok: z.string().uuid(),
  jumlah_tandan: z.coerce.number().int().nonnegative(),
  berat_tbs_kg: z.coerce.number().nonnegative(),
  mandor: z.string().max(100).optional(),
  kualitas: z.enum(["A", "B", "C"]),
});

type PanenInput = z.infer<typeof PanenSchema>;

/* =======================
   GET ALL PANEN
======================= */
export async function GET() {
  const { data, error } = await db
    .from("panen_tbs")
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
    .order("tanggal_panen", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   CREATE PANEN
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = PanenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: PanenInput = parsed.data;

  /* =======================
     HITUNG HASIL PER HA
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

  const hasil_per_ha = input.berat_tbs_kg / Number(blok.luas_blok_ha);

  const { data, error } = await db
    .from("panen_tbs")
    .insert({
      ...input,
      hasil_per_ha,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
