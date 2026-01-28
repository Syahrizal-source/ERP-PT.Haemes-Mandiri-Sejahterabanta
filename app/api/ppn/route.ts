import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ppnSchema } from "@/lib/validators/ppn";
import { calcPPN } from "@/lib/pajak/calc-ppn";

type PPNRow = {
  id: number;
  id_transaksi: number;
  jenis_ppn: "keluaran" | "masukan";
  nilai_dasar: number;
  tarif_ppn: number;
  nilai_ppn: number;
  tanggal_transaksi: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("ppn")
    .select(
      "id,id_transaksi,jenis_ppn,nilai_dasar,tarif_ppn,nilai_ppn,tanggal_transaksi",
    )
    .order("tanggal_transaksi", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data PPN" },
      { status: 500 },
    );
  }

  const result: PPNRow[] = data.map((r) => ({
    id: r.id as number,
    id_transaksi: r.id_transaksi as number,
    jenis_ppn: r.jenis_ppn as "keluaran" | "masukan",
    nilai_dasar: Number(r.nilai_dasar),
    tarif_ppn: Number(r.tarif_ppn),
    nilai_ppn: Number(r.nilai_ppn),
    tanggal_transaksi: r.tanggal_transaksi as string,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<NextResponse> {
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
    .insert({
      id_transaksi,
      jenis_ppn,
      nilai_dasar,
      tarif_ppn,
      nilai_ppn,
      tanggal_transaksi,
    })
    .select(
      "id,id_transaksi,jenis_ppn,nilai_dasar,tarif_ppn,nilai_ppn,tanggal_transaksi",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert PPN" },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
