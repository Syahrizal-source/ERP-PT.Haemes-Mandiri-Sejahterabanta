import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdateTenagaKerjaSchema = z.object({
  nama: z.string().min(1).max(100),
  jabatan: z.string().min(1).max(100),
  tipe: z.enum(["Harian", "Borongan", "Tetap"]),
  upah_harian: z.coerce.number().nonnegative(), // anti minus
  status: z.enum(["aktif", "nonaktif"]),
});

type UpdateTenagaKerjaInput = z.infer<typeof UpdateTenagaKerjaSchema>;

/* =======================
   UPDATE TENAGA KERJA
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateTenagaKerjaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateTenagaKerjaInput = parsed.data;

  const { data, error } = await db
    .from("tenaga_kerja_kebun")
    .update(input)
    .eq("id_tk", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE TENAGA KERJA
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db
    .from("tenaga_kerja_kebun")
    .delete()
    .eq("id_tk", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
