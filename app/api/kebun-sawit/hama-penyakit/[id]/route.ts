import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdateHamaPenyakitSchema = z.object({
  tanggal: z.string().min(1),
  id_blok: z.string().uuid(),
  jenis_hama: z.string().min(1).max(100),
  jenis_obat: z.string().min(1).max(100),
  biaya: z.coerce.number().nonnegative(),
  hasil_pengendalian: z.string().optional(),
});

type UpdateHamaPenyakitInput = z.infer<typeof UpdateHamaPenyakitSchema>;

/* =======================
   UPDATE HAMA & PENYAKIT
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateHamaPenyakitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateHamaPenyakitInput = parsed.data;

  const { data, error } = await db
    .from("hama_penyakit")
    .update(input)
    .eq("id_hp", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE HAMA & PENYAKIT
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("hama_penyakit")
    .delete()
    .eq("id_hp", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
