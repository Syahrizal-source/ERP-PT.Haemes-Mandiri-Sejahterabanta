import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pph4Schema } from "@/lib/validators/pph4";
import { calcPPH4 } from "@/lib/pajak/calc-pph4";

type PPH4Row = {
  id: number;
  id_vendor: number;
  jenis_objek: string;
  nilai_transaksi: number;
  tarif_pph4: number;
  pph4_terutang: number;
  tanggal_transaksi: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pph4")
    .select(
      "id,id_vendor,jenis_objek,nilai_transaksi,tarif_pph4,pph4_terutang,tanggal_transaksi",
    )
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPH4" },
      { status: 500 },
    );
  }

  const result: PPH4Row[] = data.map((r) => ({
    id: r.id as number,
    id_vendor: r.id_vendor as number,
    jenis_objek: r.jenis_objek as string,
    nilai_transaksi: Number(r.nilai_transaksi),
    tarif_pph4: Number(r.tarif_pph4),
    pph4_terutang: Number(r.pph4_terutang),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
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
    .insert({
      id_vendor,
      jenis_objek,
      nilai_transaksi,
      tarif_pph4,
      pph4_terutang,
      tanggal_transaksi,
    })
    .select(
      "id,id_vendor,jenis_objek,nilai_transaksi,tarif_pph4,pph4_terutang,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert PPH4" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
