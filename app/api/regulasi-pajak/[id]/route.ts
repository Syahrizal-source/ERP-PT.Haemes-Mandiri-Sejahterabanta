import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { regulasiPajakUpdateSchema } from "@/lib/validators/regulasi-pajak";

type Params = { id: string };

export async function PUT(
  req: Request,
  ctx: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const regulasiId = Number(id);

  if (!Number.isInteger(regulasiId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = regulasiPajakUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data: old } = await db
    .from("regulasi_pajak")
    .select("*")
    .eq("id", regulasiId)
    .single();

  if (!old) {
    return NextResponse.json(
      { error: "Data tidak ditemukan" },
      { status: 404 },
    );
  }

  // Simpan history
  await db.from("regulasi_pajak_history").insert({
    regulasi_id: regulasiId,
    tarif_lama: old.tarif,
    tarif_baru: parsed.data.tarif ?? old.tarif,
    tahun: old.tahun,
  });

  // Nonaktifkan versi lama
  await db.from("regulasi_pajak").update({ aktif: false }).eq("id", regulasiId);

  // Insert versi baru
  const { data: newReg, error: insertErr } = await db
    .from("regulasi_pajak")
    .insert({
      ...old,
      ...parsed.data,
      versi: old.versi + 1,
      aktif: true,
    })
    .select()
    .single();

  if (insertErr || !newReg) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Gagal buat versi baru" },
      { status: 500 },
    );
  }

  return NextResponse.json(newReg);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const regulasiId = Number(id);

  if (!Number.isInteger(regulasiId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  await db.from("regulasi_pajak").update({ aktif: false }).eq("id", regulasiId);

  return NextResponse.json({ success: true });
}
