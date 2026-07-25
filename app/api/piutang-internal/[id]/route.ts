import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { piutangInternalSchema } from "@/lib/validators/piutang-internal";

type Params = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_piutang = Number(id);

  if (!Number.isInteger(id_piutang)) {
    return NextResponse.json(
      { error: "ID piutang tidak valid" },
      { status: 400 },
    );
  }

  const { data } = await db
    .from("piutang_internal")
    .select("id_piutang,tanggal,pihak,keterangan,nominal,status")
    .eq("id_piutang", id_piutang)
    .single();

  if (!data) {
    return NextResponse.json(
      { error: "Piutang internal tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    id_piutang: data.id_piutang as number,
    tanggal: data.tanggal as string,
    pihak: data.pihak as string,
    keterangan: data.keterangan as string,
    nominal: Number(data.nominal),
    status: data.status,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_piutang = Number(id);

  if (!Number.isInteger(id_piutang)) {
    return NextResponse.json(
      { error: "ID piutang tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = piutangInternalSchema.parse(body);

  const { data } = await db
    .from("piutang_internal")
    .update(parsed)
    .eq("id_piutang", id_piutang)
    .select("id_piutang,tanggal,pihak,keterangan,nominal,status")
    .single();

  if (!data) {
    return NextResponse.json(
      { error: "Gagal update piutang internal" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id_piutang: data.id_piutang as number,
    tanggal: data.tanggal as string,
    pihak: data.pihak as string,
    keterangan: data.keterangan as string,
    nominal: Number(data.nominal),
    status: data.status,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_piutang = Number(id);

  if (!Number.isInteger(id_piutang)) {
    return NextResponse.json(
      { error: "ID piutang tidak valid" },
      { status: 400 },
    );
  }

  await db.from("piutang_internal").delete().eq("id_piutang", id_piutang);
  return NextResponse.json({ success: true });
}
