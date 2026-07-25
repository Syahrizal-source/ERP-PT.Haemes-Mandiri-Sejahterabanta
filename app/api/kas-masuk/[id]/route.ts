import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasMasukSchema, type KasMasukInput } from "@/lib/validators/kas-masuk";

/* =========================
   TYPES
========================= */

type Context = {
  params: Promise<{ id: string }>;
};

interface KasMasukRow {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const kasId: number = Number(id);

    const { data, error } = await db
      .from("kas_masuk")
      .select("*")
      .eq("id", kasId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: KasMasukRow = data;

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
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
    const kasId: number = Number(id);

    const body: unknown = await req.json();

    const parsed = kasMasukSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: KasMasukInput = parsed.data;

    const nominal: number = input.nominal;
    const ppn: number = nominal * 0.11;
    const pph23: number = nominal * 0.02;
    const total: number = nominal + ppn - pph23;

    if (total <= 0) {
      return NextResponse.json({ error: "Total tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("kas_masuk")
      .update({
        tanggal: input.tanggal,
        no_bukti: input.no_bukti,
        sumber: input.sumber,
        id_akun_kas: input.id_akun_kas,
        id_akun_lawan: input.id_akun_lawan,
        nominal,
        ppn,
        pph23,
        total,
        keterangan: input.keterangan,
      })
      .eq("id", kasId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal update" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Kas masuk berhasil diupdate",
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
  try {
    const { id } = await context.params;
    const kasId: number = Number(id);

    const { error } = await db.from("kas_masuk").delete().eq("id", kasId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Kas masuk berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
