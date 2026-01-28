import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { asetSchema } from "@/lib/validators/aset";
import { calcDepresiasiBulanan } from "@/lib/aset/calc-depresiasi";

type Params = { id: string };

type AsetRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
};

/* =========================
   PUT: Update Aset
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const asetId = Number(id);

  if (!Number.isInteger(asetId)) {
    return NextResponse.json({ error: "ID aset tidak valid" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = asetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { nama, nilai_perolehan, tanggal_perolehan, umur_manfaat } =
    parsed.data;

  const { data: existing, error: existingError } = await db
    .from("aset")
    .select("id_aset")
    .eq("id_aset", asetId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Aset tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data, error } = await db
    .from("aset")
    .update({
      nama,
      nilai_perolehan,
      tanggal_perolehan,
      umur_manfaat,
    })
    .eq("id_aset", asetId)
    .select("id_aset,nama,nilai_perolehan,tanggal_perolehan,umur_manfaat")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update aset" },
      { status: 500 },
    );
  }

  const row: AsetRow = {
    id_aset: data.id_aset as number,
    nama: data.nama as string,
    nilai_perolehan: Number(data.nilai_perolehan),
    tanggal_perolehan: data.tanggal_perolehan as string,
    umur_manfaat: data.umur_manfaat as number,
  };

  return NextResponse.json({
    ...row,
    depresiasi_bulanan: calcDepresiasiBulanan(
      row.nilai_perolehan,
      row.umur_manfaat,
    ),
  });
}

/* =========================
   DELETE: Delete Aset
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const asetId = Number(id);

  if (!Number.isInteger(asetId)) {
    return NextResponse.json({ error: "ID aset tidak valid" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await db
    .from("aset")
    .select("id_aset")
    .eq("id_aset", asetId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Aset tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("aset").delete().eq("id_aset", asetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
