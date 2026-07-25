import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasKeluarSchema, KasKeluarInput } from "@/lib/validators/kas-keluar";

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const { id } = await context.params;

  const { data, error } = await db
    .from("kas_keluar")
    .select("*")
    .eq("id", Number(id))
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
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const body: unknown = await req.json();
    const parsed = kasKeluarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: KasKeluarInput = parsed.data;

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;
    const total: number = nominal + ppn - pph23;

    if (total <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }

    const { error } = await db
      .from("kas_keluar")
      .update({
        tanggal: input.tanggal,
        no_bukti: input.no_bukti,
        tujuan: input.tujuan,
        id_akun_kas: input.id_akun_kas,
        id_akun_beban: input.id_akun_beban,
        nominal,
        ppn,
        pph23,
        total,
        keterangan: input.keterangan,
      })
      .eq("id", Number(id));

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Kas keluar berhasil diupdate",
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
  context: Context,
): Promise<NextResponse> {
  const { id } = await context.params;

  const { error } = await db.from("kas_keluar").delete().eq("id", Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Kas keluar berhasil dihapus",
  });
}
