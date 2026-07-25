import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasbonPribadiSchema } from "@/lib/validators/kasbon";

type Params = {
  id: string;
};

type KasbonRow = {
  id: string;
  debit: number | null;
  kredit: number | null;
};

/* =========================
   GET
========================= */
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;

  const { data, error } = await db
    .from("kasbon_pribadi")
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
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;

  const body: unknown = await req.json();

  const parsed = kasbonPribadiSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { error } = await db
    .from("kasbon_pribadi")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* =========================
     HITUNG ULANG SALDO
  ========================= */
  const { data: rows, error: fetchError } = await db
    .from("kasbon_pribadi")
    .select("id,debit,kredit")
    .order("created_at", {
      ascending: true,
    });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let saldo = 0;

  for (const row of (rows ?? []) as KasbonRow[]) {
    const debit: number = Number(row.debit ?? 0);

    const kredit: number = Number(row.kredit ?? 0);

    saldo += debit - kredit;

    await db.from("kasbon_pribadi").update({ saldo }).eq("id", row.id);
  }

  return NextResponse.json({
    success: true,
    message: "Kasbon pribadi berhasil diupdate",
  });
}

/* =========================
   DELETE
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  try {
    const { id } = await params;

    /* =========================
       DELETE DATA
    ========================= */
    const { error } = await db.from("kasbon_pribadi").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    /* =========================
       HITUNG ULANG SALDO
    ========================= */
    const { data: rows, error: fetchError } = await db
      .from("kasbon_pribadi")
      .select("id,debit,kredit")
      .order("created_at", {
        ascending: true,
      });

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let saldo = 0;

    for (const row of (rows ?? []) as KasbonRow[]) {
      const debit: number = Number(row.debit ?? 0);

      const kredit: number = Number(row.kredit ?? 0);

      saldo += debit - kredit;

      await db.from("kasbon_pribadi").update({ saldo }).eq("id", row.id);
    }

    return NextResponse.json({
      success: true,
      message: "Kasbon pribadi berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      { status: 500 },
    );
  }
}
