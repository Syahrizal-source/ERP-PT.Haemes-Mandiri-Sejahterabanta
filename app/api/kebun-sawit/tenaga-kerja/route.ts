import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const TenagaKerjaSchema = z.object({
  nama: z.string().min(1).max(100),
  jabatan: z.string().min(1).max(100),
  tipe: z.enum(["Harian", "Borongan", "Tetap"]),
  upah_harian: z.coerce.number().nonnegative(), // anti minus
  status: z.enum(["aktif", "nonaktif"]),
});

type TenagaKerjaInput = z.infer<typeof TenagaKerjaSchema>;

/* =======================
   GET ALL TENAGA KERJA
======================= */
export async function GET() {
  const { data, error } = await db
    .from("tenaga_kerja_kebun")
    .select("*")
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/* =======================
   CREATE TENAGA KERJA
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = TenagaKerjaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: TenagaKerjaInput = parsed.data;

  const { data, error } = await db
    .from("tenaga_kerja_kebun")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
