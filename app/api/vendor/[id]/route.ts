import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { vendorSchema } from "@/lib/validators/vendor";

type Params = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const id_vendor = Number(id);

  if (!Number.isInteger(id_vendor)) {
    return NextResponse.json(
      { error: "ID vendor tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = vendorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { data, error } = await db
    .from("vendor")
    .update(parsed.data)
    .eq("id_vendor", id_vendor)
    .select("id_vendor,nama,npwp,alamat")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update vendor" },
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
  const id_vendor = Number(id);

  if (!Number.isInteger(id_vendor)) {
    return NextResponse.json(
      { error: "ID vendor tidak valid" },
      { status: 400 },
    );
  }

  const { error } = await db.from("vendor").delete().eq("id_vendor", id_vendor);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
