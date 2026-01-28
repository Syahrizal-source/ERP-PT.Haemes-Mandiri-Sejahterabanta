import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const KebunBiayaSchema = z.object({
  tanggal: z.string().min(1),
  jenis_biaya: z.string().min(1).max(100),
  jumlah: z.coerce.number().nonnegative(), // anti minus
  id_blok: z.string().uuid().optional(),
  lokasi: z.string().max(150).optional(),
  referensi: z.string().max(100).optional(),
});

type KebunBiayaInput = z.infer<typeof KebunBiayaSchema>;

/* =======================
   GET ALL BIAYA KEBUN
======================= */
export async function GET() {
  const { data, error } = await db
    .from("kebun_biaya")
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
   CREATE BIAYA KEBUN
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = KebunBiayaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: KebunBiayaInput = parsed.data;

  const { data, error } = await db
    .from("kebun_biaya")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
