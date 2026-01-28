import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const KebunSchema = z.object({
  kode_kebun: z.string().min(1).max(20),
  nama_kebun: z.string().min(1).max(150),
  lokasi: z.string().optional(),
  luas_ha: z.coerce.number().nonnegative().optional(),
  jumlah_blok: z.coerce.number().int().nonnegative().optional(),
  tahun_tanam_awal: z.coerce.number().int().optional(),
  jenis_bibit: z.string().max(50).optional(),
  manager_kebun: z.string().max(100).optional(),
  status: z.enum(["aktif", "nonaktif"]),
});

type KebunInput = z.infer<typeof KebunSchema>;

/* =======================
GET ALL KEBUN
======================= */
export async function GET() {
  const { data, error } = await db
    .from("master_kebun")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
CREATE KEBUN
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = KebunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: KebunInput = parsed.data;

  const { data, error } = await db
    .from("master_kebun")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
