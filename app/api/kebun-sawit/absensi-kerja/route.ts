import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const AbsensiSchema = z.object({
  tanggal: z.string().min(1),
  id_tk: z.string().uuid(),
  status_hadir: z.enum(["Hadir", "Izin", "Sakit", "Alpha"]),
  jam_masuk: z.string().optional(),
  jam_pulang: z.string().optional(),
  keterangan: z.string().optional(),
});

type AbsensiInput = z.infer<typeof AbsensiSchema>;

/* =======================
   GET ABSENSI
======================= */
export async function GET() {
  const { data, error } = await db
    .from("absensi_tenaga_kerja")
    .select(
      `
      *,
      tenaga_kerja_kebun (
        nama,
        jabatan,
        tipe
      )
    `,
    )
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/* =======================
   CREATE ABSENSI
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = AbsensiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: AbsensiInput = parsed.data;

  const { data, error } = await db
    .from("absensi_tenaga_kerja")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
