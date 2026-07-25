import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { asetSchema, type AsetInput } from "@/lib/validators/aset";

/* =========================
   PARAM VALIDATION
========================= */

const paramSchema = z.object({
  id: z.string(),
});

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const id: number = Number(parsed.data.id);

  const { data, error } = await db
    .from("aset")
    .select("*")
    .eq("id_aset", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   PUT
========================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const id: number = Number(parsedParams.data.id);

    const body: unknown = await req.json();

    const parsedBody = asetSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: AsetInput = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const nominal: number = input.nilai_perolehan;

    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;

    const total: number = nominal + ppn - pph23;

    /* =========================
       ANTI MINUS
    ========================= */

    if (total <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }

    const depresiasi: number = nominal / input.umur_manfaat;

    /* =========================
       UPDATE
    ========================= */

    const { data, error } = await db
      .from("aset")
      .update({
        nama: input.nama,
        nilai_perolehan: nominal,
        tanggal_perolehan: input.tanggal_perolehan,
        umur_manfaat: input.umur_manfaat,
        depresiasi_bulanan: depresiasi,
        ppn,
        pph23,
        total,
      })
      .eq("id_aset", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update aset");
    }

    return NextResponse.json({
      message: "Aset berhasil diupdate",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const params = await ctx.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const id: number = Number(parsed.data.id);

  const { error } = await db.from("aset").delete().eq("id_aset", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Aset berhasil dihapus",
  });
}
