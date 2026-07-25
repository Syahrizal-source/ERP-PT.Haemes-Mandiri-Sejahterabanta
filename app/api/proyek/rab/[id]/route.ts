import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

/* =====================
   TYPE CONTEXT (WAJIB)
===================== */
type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =====================
   GET DETAIL RAB
===================== */
export async function GET(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_rab")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Gagal mengambil detail RAB" },
      { status: 500 },
    );
  }
}

/* =====================
   UPDATE RAB
===================== */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.volume !== undefined) {
      validatePositive(body.volume, "Volume");
    }

    if (body.harga_satuan !== undefined) {
      validatePositive(body.harga_satuan, "Harga Satuan");
    }

    const { error } = await db.from("proyek_rab").update(body).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "RAB berhasil diupdate",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* =====================
   DELETE RAB
===================== */
export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { error } = await db.from("proyek_rab").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "RAB berhasil dihapus",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Gagal menghapus RAB" }, { status: 500 });
  }
}
