import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { TagihanProyekSchema } from "@/lib/validators/tagihanproyek";
import { validatePositive } from "@/lib/validator";

type Context = {
  params: Promise<{ id: string }>;
};

/* ======================
   UPDATE TAGIHAN
====================== */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const payload = TagihanProyekSchema.parse(await req.json());
    validatePositive(payload.nilai, "Nilai");

    const { error } = await db
      .from("proyek_tagihan")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Tagihan berhasil diupdate",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/* ======================
   DELETE TAGIHAN + JURNAL
====================== */
export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    // ambil nomor invoice
    const { data: tagihan } = await db
      .from("proyek_tagihan")
      .select("nomor_invoice")
      .eq("id", id)
      .single();

    if (!tagihan) {
      throw new Error("Tagihan tidak ditemukan");
    }

    // hapus jurnal
    await db
      .from("jurnal")
      .delete()
      .eq("no_bukti", `INV-${tagihan.nomor_invoice}`);

    // hapus tagihan
    const { error } = await db.from("proyek_tagihan").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Tagihan & jurnal berhasil dihapus",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
