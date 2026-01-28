import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
ZOD SCHEMA
======================= */
const UpdateBlokSchema = z.object({
  kode_blok: z.string().min(1).max(20),
  id_kebun: z.string().uuid(),
  luas_blok_ha: z.coerce.number().nonnegative().optional(),
  tahun_tanam: z.coerce.number().int().optional(),
  jumlah_pokok: z.coerce.number().int().nonnegative().optional(),
  status_blok: z.enum(["Produktif", "TBM", "Replanting"]),
});

type UpdateBlokInput = z.infer<typeof UpdateBlokSchema>;

/* =======================
UPDATE BLOK
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateBlokSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateBlokInput = parsed.data;

  const { data, error } = await db
    .from("master_blok")
    .update(input)
    .eq("id_blok", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
DELETE BLOK
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("master_blok")
    .delete()
    .eq("id_blok", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
