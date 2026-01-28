import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdatePanenSchema = z.object({
  tanggal_panen: z.string().min(1),
  id_blok: z.string().uuid(),
  jumlah_tandan: z.coerce.number().int().nonnegative(),
  berat_tbs_kg: z.coerce.number().nonnegative(),
  mandor: z.string().max(100).optional(),
  kualitas: z.enum(["A", "B", "C"]),
});

type UpdatePanenInput = z.infer<typeof UpdatePanenSchema>;

/* =======================
   UPDATE PANEN
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdatePanenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdatePanenInput = parsed.data;

  const { data: blok, error: blokError } = await db
    .from("master_blok")
    .select("luas_blok_ha")
    .eq("id_blok", input.id_blok)
    .single();

  if (blokError || !blok?.luas_blok_ha || blok.luas_blok_ha <= 0) {
    return NextResponse.json(
      { error: "Luas blok tidak valid" },
      { status: 400 },
    );
  }

  const hasil_per_ha = input.berat_tbs_kg / Number(blok.luas_blok_ha);

  const { data, error } = await db
    .from("panen_tbs")
    .update({
      ...input,
      hasil_per_ha,
    })
    .eq("id_panen", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE PANEN
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("panen_tbs")
    .delete()
    .eq("id_panen", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
