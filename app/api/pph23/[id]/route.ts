import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph23Schema } from "@/lib/validators/pph23";
import { calcPPH23 } from "@/lib/pajak/calc-pph23";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pphId = Number(id);

  if (!Number.isInteger(pphId)) {
    return NextResponse.json(
      { error: "ID PPH23 tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = pph23Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const {
    id_vendor,
    jenis_jasa,
    nilai_transaksi,
    tarif_pph23,
    tanggal_transaksi,
  } = parsed.data;

  const pph23_terutang = calcPPH23(nilai_transaksi, tarif_pph23);

  const { data, error } = await db
    .from("pph23")
    .update({
      id_vendor,
      jenis_jasa,
      nilai_transaksi,
      tarif_pph23,
      pph23_terutang,
      tanggal_transaksi,
    })
    .eq("id", pphId)
    .select(
      "id,id_vendor,jenis_jasa,nilai_transaksi,tarif_pph23,pph23_terutang,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update PPH23" },
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
  const pphId = Number(id);

  if (!Number.isInteger(pphId)) {
    return NextResponse.json(
      { error: "ID PPH23 tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db.from("pph23").delete().eq("id", pphId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
