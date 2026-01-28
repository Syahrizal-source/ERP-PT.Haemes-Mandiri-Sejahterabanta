import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ppnSchema } from "@/lib/validators/ppn";
import { calcPPN } from "@/lib/pajak/calc-ppn";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const ppnId = Number(id);

  if (!Number.isInteger(ppnId)) {
    return NextResponse.json({ error: "ID PPN tidak valid" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = ppnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_transaksi, jenis_ppn, nilai_dasar, tarif_ppn, tanggal_transaksi } =
    parsed.data;

  const nilai_ppn = calcPPN(nilai_dasar, tarif_ppn);

  const { data, error } = await db
    .from("ppn")
    .update({
      id_transaksi,
      jenis_ppn,
      nilai_dasar,
      tarif_ppn,
      nilai_ppn,
      tanggal_transaksi,
    })
    .eq("id", ppnId)
    .select(
      "id,id_transaksi,jenis_ppn,nilai_dasar,tarif_ppn,nilai_ppn,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update PPN" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const ppnId = Number(id);

  if (!Number.isInteger(ppnId)) {
    return NextResponse.json({ error: "ID PPN tidak valid" }, { status: 400 });
  }

  const { error } = await db.from("ppn").delete().eq("id", ppnId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
