import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import {
  pph23Schema,
  type Pph23Input,
  hitungPph23,
} from "@/lib/validators/pph23";

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
    .from("pph23")
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

    const parsedBody = pph23Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: Pph23Input = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const pph23_terutang: number = hitungPph23(input);

    if (pph23_terutang <= 0) {
      return NextResponse.json({ error: "Nilai tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("pph23")
      .update({
        id_vendor: input.id_vendor,
        jenis_jasa: input.jenis_jasa,
        nilai_transaksi: input.nilai_transaksi,
        tarif_pph23: input.tarif_pph23,
        pph23_terutang,
        tanggal_transaksi: input.tanggal_transaksi,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "PPh23 berhasil diupdate",
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

  const { error } = await db.from("pph23").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "PPh23 berhasil dihapus",
  });
}
