import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const DataTanamanSchema = z.object({
  id_blok: z.string().uuid(),
  jumlah_pokok: z.coerce.number().int().nonnegative(),
  umur_tanaman_tahun: z.coerce.number().int().nonnegative(),
  kondisi: z.enum(["baik", "rusak", "mati"]),
});

type DataTanamanInput = z.infer<typeof DataTanamanSchema>;

/* =======================
GET ALL DATA TANAMAN
======================= */
export async function GET() {
  const { data, error } = await db
    .from("data_tanaman")
    .select(
      `
*,
master_blok (
id_blok,
kode_blok
)
`,
    )
    .order("id_tanaman", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
CREATE DATA TANAMAN
======================= */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json();

  const parsed = DataTanamanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: DataTanamanInput = parsed.data;

  const { data, error } = await db
    .from("data_tanaman")
    .insert(input)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
