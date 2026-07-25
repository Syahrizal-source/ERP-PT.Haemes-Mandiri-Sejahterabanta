import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { PiutangNonProyekSchema } from "@/lib/validators/piutangnonproyek";

type Context = {
  params: Promise<{ id: string }>;
};

/* =========================
   UPDATE PIUTANG
========================= */
export async function PUT(req: NextRequest, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const payload = PiutangNonProyekSchema.parse(await req.json());

    // hapus jurnal lama
    await db.from("jurnal").delete().eq("no_bukti", `PNP-${id}`);

    // update piutang
    await db.from("piutang_non_proyek").update(payload).eq("id", id);

    return NextResponse.json({
      message: "Piutang non proyek berhasil diupdate",
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* =========================
   DELETE PIUTANG
========================= */
export async function DELETE(_: NextRequest, ctx: Context) {
  try {
    const { id } = await ctx.params;

    await db.from("jurnal").delete().eq("no_bukti", `PNP-${id}`);
    await db.from("piutang_non_proyek").delete().eq("id", id);

    return NextResponse.json({
      message: "Piutang non proyek berhasil dihapus",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus piutang" },
      { status: 500 },
    );
  }
}
