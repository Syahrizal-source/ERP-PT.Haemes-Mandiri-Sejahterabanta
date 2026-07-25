import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import {
  pembayaranHutangSchema,
  type PembayaranHutangInput,
} from "@/lib/validators/pembayaran-hutang";

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
    .from("pembayaran_hutang")
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

    const parsedBody = pembayaranHutangSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PembayaranHutangInput = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;

    const totalHutang: number = nominal + ppn;
    const totalBayar: number = totalHutang - pph23;

    if (totalBayar <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }

    /* =========================
       UPDATE
    ========================= */

    const { data, error } = await db
      .from("pembayaran_hutang")
      .update({
        tanggal: input.tanggal,
        id_hutang: input.id_hutang,
        nominal,
        ppn,
        pph23,
        total: totalBayar,
        keterangan: input.keterangan,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "Pembayaran hutang berhasil diupdate",
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

  const { error } = await db.from("pembayaran_hutang").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Pembayaran hutang berhasil dihapus",
  });
}
