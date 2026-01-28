import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const HamaPenyakitSchema = z.object({
  tanggal: z.string().min(1),
  id_blok: z.string().uuid(),
  jenis_hama: z.string().min(1).max(100),
  jenis_obat: z.string().min(1).max(100),
  biaya: z.coerce.number().nonnegative(),
  hasil_pengendalian: z.string().optional(),
});

type HamaPenyakitInput = z.infer<typeof HamaPenyakitSchema>;

/* =======================
   GET ALL HAMA & PENYAKIT
======================= */
export async function GET() {
  const { data, error } = await db
    .from("hama_penyakit")
    .select(
      `
      *,
      master_blok (
        id_blok,
        kode_blok
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
   CREATE HAMA & PENYAKIT
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = HamaPenyakitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: HamaPenyakitInput = parsed.data;

  const { data, error } = await db
    .from("hama_penyakit")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
