import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =======================
   ZOD SCHEMA
======================= */
const UpdateKebunBiayaSchema = z.object({
  tanggal: z.string().min(1),
  jenis_biaya: z.string().min(1).max(100),
  jumlah: z.coerce.number().nonnegative(), // anti minus
  id_blok: z.string().uuid().optional(),
  lokasi: z.string().max(150).optional(),
  referensi: z.string().max(100).optional(),
});

type UpdateKebunBiayaInput = z.infer<typeof UpdateKebunBiayaSchema>;

/* =======================
   UPDATE BIAYA KEBUN
======================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body: unknown = await req.json();

  const parsed = UpdateKebunBiayaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const input: UpdateKebunBiayaInput = parsed.data;

  const { data, error } = await db
    .from("kebun_biaya")
    .update(input)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

/* =======================
   DELETE BIAYA KEBUN
======================= */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const { error } = await db.from("kebun_biaya").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
