import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph4Schema } from "@/lib/validators/pph4";
import { calcPPH4 } from "@/lib/pajak/calc-pph4";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pph4Id = Number(id);

  if (!Number.isInteger(pph4Id)) {
    return NextResponse.json({ error: "ID PPH4 tidak valid" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = pph4Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const {
    id_vendor,
    jenis_objek,
    nilai_transaksi,
    tarif_pph4,
    tanggal_transaksi,
  } = parsed.data;

  const pph4_terutang = calcPPH4(nilai_transaksi, tarif_pph4);

  const { data, error } = await db
    .from("pph4")
    .update({
      id_vendor,
      jenis_objek,
      nilai_transaksi,
      tarif_pph4,
      pph4_terutang,
      tanggal_transaksi,
    })
    .eq("id", pph4Id)
    .select(
      "id,id_vendor,jenis_objek,nilai_transaksi,tarif_pph4,pph4_terutang,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update PPH4" },
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
  const pph4Id = Number(id);

  if (!Number.isInteger(pph4Id)) {
    return NextResponse.json({ error: "ID PPH4 tidak valid" }, { status: 400 });
  }

  const { error } = await db.from("pph4").delete().eq("id", pph4Id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
