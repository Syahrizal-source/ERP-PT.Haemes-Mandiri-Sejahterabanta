import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { piutangSchema } from "@/lib/validators/piutang";

type Params = { id: string };

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
  const parsed = piutangSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("piutang")
    .update(parsed.data)
    .eq("id_piutang", id_piutang)
    .select("id_piutang,customer,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update piutang" },
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
  const id_piutang = Number(id);

  if (!Number.isInteger(id_piutang)) {
    return NextResponse.json(
      { error: "ID piutang tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db
    .from("piutang")
    .delete()
    .eq("id_piutang", id_piutang);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
