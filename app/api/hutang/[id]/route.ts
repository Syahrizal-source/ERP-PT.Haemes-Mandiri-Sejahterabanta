import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hutangSchema } from "@/lib/validators/hutang";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_hutang = Number(id);

  if (!Number.isInteger(id_hutang)) {
    return NextResponse.json(
      { error: "ID hutang tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = hutangSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("hutang")
    .update(parsed.data)
    .eq("id_hutang", id_hutang)
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update hutang" },
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
  const id_hutang = Number(id);

  if (!Number.isInteger(id_hutang)) {
    return NextResponse.json(
      { error: "ID hutang tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db.from("hutang").delete().eq("id_hutang", id_hutang);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
