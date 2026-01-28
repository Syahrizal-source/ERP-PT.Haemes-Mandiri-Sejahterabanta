import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pendapatanSchema } from "@/lib/validators/pendapatan";

type Params = { id: string };

type PendapatanRow = {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  keterangan: string;
};

/* =========================
   PUT: Update Pendapatan
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pendapatanId = Number(id);

  if (!Number.isInteger(pendapatanId)) {
    return NextResponse.json(
      { error: "ID pendapatan tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = pendapatanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { tanggal, id_coa, nominal, keterangan } = parsed.data;

  const { data: existing, error: existingError } = await db
    .from("pendapatan")
    .select("id")
    .eq("id", pendapatanId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Pendapatan tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data, error } = await db
    .from("pendapatan")
    .update({
      tanggal,
      id_coa,
      nominal,
      keterangan,
    })
    .eq("id", pendapatanId)
    .select("id,tanggal,id_coa,nominal,keterangan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update pendapatan" },
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

  return NextResponse.json(row);
}

/* =========================
   DELETE: Delete Pendapatan
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const pendapatanId = Number(id);

  if (!Number.isInteger(pendapatanId)) {
    return NextResponse.json(
      { error: "ID pendapatan tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("pendapatan")
    .select("id")
    .eq("id", pendapatanId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Pendapatan tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("pendapatan").delete().eq("id", pendapatanId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
