import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { pph4Schema, type Pph4Input, hitungPph4 } from "@/lib/validators/pph4";

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
    .from("pph4")
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

    const id: number = Number(parsedParams.data.id);

    const body: unknown = await req.json();

    const parsedBody = pph4Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: Pph4Input = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const pph4_terutang: number = hitungPph4(input);

    if (pph4_terutang <= 0) {
      return NextResponse.json({ error: "Nilai tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("pph4")
      .update({
        id_vendor: input.id_vendor,
        jenis_objek: input.jenis_objek,
        nilai_transaksi: input.nilai_transaksi,
        tarif_pph4: input.tarif_pph4,
        pph4_terutang,
        tanggal_transaksi: input.tanggal_transaksi,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "PPh4 berhasil diupdate",
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

  const { error } = await db.from("pph4").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "PPh4 berhasil dihapus",
  });
}
