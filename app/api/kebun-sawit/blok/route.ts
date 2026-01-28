import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const BlokSchema = z.object({
  kode_blok: z.string().min(1).max(20),
  id_kebun: z.string().uuid(),
  luas_blok_ha: z.coerce.number().nonnegative().optional(),
  tahun_tanam: z.coerce.number().int().optional(),
  jumlah_pokok: z.coerce.number().int().nonnegative().optional(),
  status_blok: z.enum(["Produktif", "TBM", "Replanting"]),
});

type BlokInput = z.infer<typeof BlokSchema>;

/* =======================
GET ALL BLOK
======================= */
export async function GET() {
  const { data, error } = await db
    .from("master_blok")
    .select(
      `
*,
master_kebun (
id_kebun,
nama_kebun
)
`,
    )
    .order("kode_blok", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
CREATE BLOK
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = BlokSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: BlokInput = parsed.data;

  const { data, error } = await db
    .from("master_blok")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
