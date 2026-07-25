import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import {
  kasArmadaSchema,
  normalizeKasArmada,
  hitungKasArmada,
  validateKasArmada,
  type KasArmadaInput,
} from "@/lib/validators/kas-armada";

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

  const id = Number(parsed.data.id);

  const { data, error } = await db
    .from("kas_armada")
    .select("*")
    .eq("id", id)
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

    const id = Number(parsedParams.data.id);

    const body: unknown = await req.json();

    const parsedBody = kasArmadaSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: KasArmadaInput = parsedBody.data;

    const dataNorm = normalizeKasArmada(input);
    validateKasArmada(dataNorm);

    const hitung = hitungKasArmada(dataNorm);

    const { data, error } = await db
      .from("kas_armada")
      .update({
        ...dataNorm,
        total_masuk: hitung.total_masuk,
        total_keluar: hitung.total_keluar,
        saldo: hitung.saldo,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "Berhasil diupdate",
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

  const id = Number(parsed.data.id);

  const { error } = await db.from("kas_armada").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Berhasil dihapus",
  });
}
