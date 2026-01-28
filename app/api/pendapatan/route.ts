import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pendapatanSchema } from "@/lib/validators/pendapatan";

type PendapatanRow = {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  keterangan: string;
};

/* =========================
   GET: List Pendapatan
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("pendapatan")
    .select("id,tanggal,id_coa,nominal,keterangan")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data pendapatan" },
      { status: 500 },
    );
  }

  const result: PendapatanRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    id_coa: r.id_coa as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Pendapatan
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = pendapatanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, id_coa, nominal, keterangan } = parsed.data;

  const { data, error } = await db
    .from("pendapatan")
    .insert({
      tanggal,
      id_coa,
      nominal,
      keterangan,
    })
    .select("id,tanggal,id_coa,nominal,keterangan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert pendapatan" },
      { status: 500 },
    );
  }

  const row: PendapatanRow = {
    id: data.id as number,
    tanggal: data.tanggal as string,
    id_coa: data.id_coa as number,
    nominal: Number(data.nominal),
    keterangan: data.keterangan as string,
  };

  return NextResponse.json(row, { status: 201 });
}
