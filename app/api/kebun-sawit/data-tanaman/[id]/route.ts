import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdateDataTanamanSchema = z.object({
  id_blok: z.string().uuid(),
  jumlah_pokok: z.coerce.number().int().nonnegative(),
  umur_tanaman_tahun: z.coerce.number().int().nonnegative(),
  kondisi: z.enum(["baik", "rusak", "mati"]),
});

type UpdateDataTanamanInput = z.infer<typeof UpdateDataTanamanSchema>;

/* =======================
   UPDATE DATA TANAMAN
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateDataTanamanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateDataTanamanInput = parsed.data;

  const { data, error } = await db
    .from("data_tanaman")
    .update(input)
    .eq("id_tanaman", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE DATA TANAMAN
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("data_tanaman")
    .delete()
    .eq("id_tanaman", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
