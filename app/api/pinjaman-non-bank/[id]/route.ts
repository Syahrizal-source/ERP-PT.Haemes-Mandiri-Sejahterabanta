import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";
import {
  pinjamanNonBankSchema,
  type PinjamanNonBankInput,
} from "@/lib/validators/pinjaman-non-bank";

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
    .from("pinjaman_non_bank")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  try {
    const params = await ctx.params;
    const id: number = Number(params.id);

    const body: unknown = await req.json();

    const parsed = pinjamanNonBankSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PinjamanNonBankInput = parsed.data;

    const totalBunga: number = (input.nominal * input.bunga_persen) / 100;

    const totalPinjaman: number = input.nominal + totalBunga;

    if (totalPinjaman <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("pinjaman_non_bank")
      .update({
        tanggal: input.tanggal,
        deskripsi: input.deskripsi,
        pihak: input.pihak,
        nominal: input.nominal,
        bunga_persen: input.bunga_persen,
        total_bunga: totalBunga,
        total_pinjaman: totalPinjaman,
        saldo: totalPinjaman,
        tanggal_pengembalian: input.tanggal_pengembalian ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Berhasil update",
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
  const id: number = Number(params.id);

  const { error } = await db.from("pinjaman_non_bank").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Berhasil dihapus",
  });
}
