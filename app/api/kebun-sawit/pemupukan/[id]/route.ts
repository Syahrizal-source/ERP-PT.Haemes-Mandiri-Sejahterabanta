import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdatePemupukanSchema = z.object({
  tanggal: z.string().min(1),
  id_blok: z.string().uuid(),
  jenis_pupuk: z.string().min(1).max(100),
  dosis_per_ha: z.coerce.number().nonnegative(),
  biaya: z.coerce.number().nonnegative(),
  pelaksana: z.string().max(100).optional(),
});

type UpdatePemupukanInput = z.infer<typeof UpdatePemupukanSchema>;

/* =======================
   UPDATE PEMUPUKAN
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdatePemupukanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdatePemupukanInput = parsed.data;

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

  const total_pupuk_kg = input.dosis_per_ha * Number(blok.luas_blok_ha);

  const { data, error } = await db
    .from("pemupukan")
    .update({
      ...input,
      total_pupuk_kg,
    })
    .eq("id_pemupukan", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE PEMUPUKAN
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("pemupukan")
    .delete()
    .eq("id_pemupukan", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
