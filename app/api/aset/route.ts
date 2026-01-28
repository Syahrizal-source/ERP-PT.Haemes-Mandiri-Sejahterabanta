import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { asetSchema } from "@/lib/validators/aset";
import { calcDepresiasiBulanan } from "@/lib/aset/calc-depresiasi";

type AsetRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
  umur_manfaat: number;
};

/* =========================
   GET: List Aset
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("aset")
    .select("id_aset,nama,nilai_perolehan,tanggal_perolehan,umur_manfaat")
    .order("tanggal_perolehan", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data aset" },
      { status: 500 },
    );
  }

  const result = data.map((a) => {
    const row: AsetRow = {
      id_aset: a.id_aset as number,
      nama: a.nama as string,
      nilai_perolehan: Number(a.nilai_perolehan),
      tanggal_perolehan: a.tanggal_perolehan as string,
      umur_manfaat: a.umur_manfaat as number,
    };

    return {
      ...row,
      depresiasi_bulanan: calcDepresiasiBulanan(
        row.nilai_perolehan,
        row.umur_manfaat,
      ),
    };
  });

  return NextResponse.json(result);
}

/* =========================
   POST: Create Aset
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = asetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { nama, nilai_perolehan, tanggal_perolehan, umur_manfaat } =
    parsed.data;

  const { data, error } = await db
    .from("aset")
    .insert({
      nama,
      nilai_perolehan,
      tanggal_perolehan,
      umur_manfaat,
    })
    .select("id_aset,nama,nilai_perolehan,tanggal_perolehan,umur_manfaat")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert aset" },
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

  return NextResponse.json(
    {
      ...row,
      depresiasi_bulanan: calcDepresiasiBulanan(
        row.nilai_perolehan,
        row.umur_manfaat,
      ),
    },
    { status: 201 },
  );
}
