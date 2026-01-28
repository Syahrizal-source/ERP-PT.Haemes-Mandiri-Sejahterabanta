import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const GajiSchema = z.object({
  periode_bulan: z.number().int().min(1).max(12),
  periode_tahun: z.number().int().min(2000),
  id_tk: z.string().uuid(),
  jumlah_hari_kerja: z.number().int().nonnegative(),
  upah_harian: z.number().nonnegative(),
});

type GajiInput = z.infer<typeof GajiSchema>;

/* =======================
CREATE GAJI
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = GajiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: GajiInput = parsed.data;

  const upah_bruto = input.jumlah_hari_kerja * input.upah_harian;
  const pph21 = 0; // nanti modul pajak
  const upah_bersih = upah_bruto - pph21;

  const { data, error } = await db
    .from("penggajian_tk")
    .insert({
      periode_bulan: input.periode_bulan,
      periode_tahun: input.periode_tahun,
      id_tk: input.id_tk,
      jumlah_hari_kerja: input.jumlah_hari_kerja,
      upah_bruto,
      pph21,
      upah_bersih,
      status_bayar: "Draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
