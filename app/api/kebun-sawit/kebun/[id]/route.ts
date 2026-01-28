import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const UpdateKebunSchema = z.object({
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

type UpdateKebunInput = z.infer<typeof UpdateKebunSchema>;

/* =======================
UPDATE KEBUN
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateKebunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateKebunInput = parsed.data;

  const { data, error } = await db
    .from("master_kebun")
    .update(input)
    .eq("id_kebun", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
DELETE KEBUN
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("master_kebun")
    .delete()
    .eq("id_kebun", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
