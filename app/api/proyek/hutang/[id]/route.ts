import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   PUT UPDATE HUTANG
========================= */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const { error } = await db.from("proyek_hutang").update(body).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Hutang berhasil diupdate",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE HUTANG
========================= */
export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { error } = await db.from("proyek_hutang").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Hutang berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
