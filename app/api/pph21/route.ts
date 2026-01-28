import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph21Schema } from "@/lib/validators/pph21";
import { calcPPH21 } from "@/lib/payroll/calc-pph21";

type PPH21Row = {
  id: number;
  nama: string;
  gaji_bruto: number;
  biaya_jabatan: number;
  iuran: number;
  tarif_pph21: number;
  nilai_pph21: number;
  tanggal: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph21")
    .select(
      "id,nama,gaji_bruto,biaya_jabatan,iuran,tarif_pph21,nilai_pph21,tanggal",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH21" },
      { status: 500 },
    );
  }

  const result: PPH21Row[] = data.map((r) => ({
    id: r.id as number,
    nama: r.nama as string,
    gaji_bruto: Number(r.gaji_bruto),
    biaya_jabatan: Number(r.biaya_jabatan),
    iuran: Number(r.iuran),
    tarif_pph21: Number(r.tarif_pph21),
    nilai_pph21: Number(r.nilai_pph21),
    tanggal: r.tanggal as string,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
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
    .insert({
      id_payroll,
      nama,
      gaji_bruto,
      biaya_jabatan,
      iuran,
      tarif_pph21,
      nilai_pph21,
      tanggal,
    })
    .select(
      "id,nama,gaji_bruto,biaya_jabatan,iuran,tarif_pph21,nilai_pph21,tanggal",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert PPH21" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
