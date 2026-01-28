import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph21Schema } from "@/lib/validators/pph21";
import { calcPPH21 } from "@/lib/payroll/calc-pph21";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pphId = Number(id);

  if (!Number.isInteger(pphId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = pph21Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const {
    id_payroll,
    nama,
    gaji_bruto,
    biaya_jabatan,
    iuran,
    tarif_pph21,
    tanggal,
  } = parsed.data;

  const nilai_pph21 = calcPPH21(gaji_bruto, biaya_jabatan, iuran, tarif_pph21);

  const { data, error } = await db
    .from("pph21")
    .update({
      id_payroll,
      nama,
      gaji_bruto,
      biaya_jabatan,
      iuran,
      tarif_pph21,
      nilai_pph21,
      tanggal,
    })
    .eq("id", pphId)
    .select(
      "id,nama,gaji_bruto,biaya_jabatan,iuran,tarif_pph21,nilai_pph21,tanggal",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update PPH21" },
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
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { error } = await db.from("pph21").delete().eq("id", pphId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
