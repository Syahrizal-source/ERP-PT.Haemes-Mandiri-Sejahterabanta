import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";
import {
  pph21Schema,
  type Pph21Input,
  hitungPph21,
} from "@/lib/validators/pph21";

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
    .from("pph21")
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

    const parsedBody = pph21Schema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: Pph21Input = parsedBody.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const hasil = hitungPph21(input);

    if (hasil.nilai_pph21 <= 0) {
      return NextResponse.json({ error: "Nilai tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("pph21")
      .update({
        id_payroll: input.id_payroll,
        nama: input.nama,
        gaji_bruto: input.gaji_bruto,
        biaya_jabatan: input.biaya_jabatan,
        iuran: input.iuran,
        tarif_pph21: input.tarif_pph21,
        thr: hasil.thr,
        penghasilan_bruto: hasil.penghasilan_bruto,
        nilai_pph21: hasil.nilai_pph21,
        tanggal: input.tanggal,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal update");
    }

    return NextResponse.json({
      message: "PPh21 berhasil diupdate",
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

  const { error } = await db.from("pph21").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "PPh21 berhasil dihapus",
  });
}
