import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph23Schema } from "@/lib/validators/pph23";
import { calcPPH23 } from "@/lib/pajak/calc-pph23";

type PPH23Row = {
  id: number;
  id_vendor: number;
  jenis_jasa: string;
  nilai_transaksi: number;
  tarif_pph23: number;
  pph23_terutang: number;
  tanggal_transaksi: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph23")
    .select(
      "id,id_vendor,jenis_jasa,nilai_transaksi,tarif_pph23,pph23_terutang,tanggal_transaksi",
    )
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH23" },
      { status: 500 },
    );
  }

  const result: PPH23Row[] = data.map((r) => ({
    id: r.id as number,
    id_vendor: r.id_vendor as number,
    jenis_jasa: r.jenis_jasa as string,
    nilai_transaksi: Number(r.nilai_transaksi),
    tarif_pph23: Number(r.tarif_pph23),
    pph23_terutang: Number(r.pph23_terutang),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
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
    .insert({
      id_vendor,
      jenis_jasa,
      nilai_transaksi,
      tarif_pph23,
      pph23_terutang,
      tanggal_transaksi,
    })
    .select(
      "id,id_vendor,jenis_jasa,nilai_transaksi,tarif_pph23,pph23_terutang,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert PPH23" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
