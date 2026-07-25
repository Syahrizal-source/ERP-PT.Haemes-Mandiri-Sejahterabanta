import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { PembayaranHutangSchema } from "@/lib/validators/pembayaranhutang";

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   UPDATE PEMBAYARAN
========================= */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const payload = PembayaranHutangSchema.parse(await req.json());

    const { error } = await db
      .from("proyek_pembayaran_hutang")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Pembayaran hutang diupdate",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* =========================
   DELETE PEMBAYARAN + JURNAL
========================= */
export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    await db.from("jurnal").delete().eq("no_bukti", `BHT-${id}`);

    const { error } = await db
      .from("proyek_pembayaran_hutang")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Pembayaran hutang & jurnal dihapus",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
