import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasKeluarSchema } from "@/lib/validators/kas-keluar";

type Params = { id: string };

type KasKeluarRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  tujuan: string;
  id_akun_kas: number;
  id_akun_beban: number;
  nominal: number;
  keterangan: string;
};

/* =========================
   PUT: Update Kas Keluar
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const kasKeluarId = Number(id);

  if (!Number.isInteger(kasKeluarId)) {
    return NextResponse.json(
      { error: "ID kas keluar tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = kasKeluarSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const {
    tanggal,
    no_bukti,
    tujuan,
    id_akun_kas,
    id_akun_beban,
    nominal,
    keterangan,
  } = parsed.data;

  // Guard: data harus ada
  const { data: existing, error: existingError } = await db
    .from("kas_keluar")
    .select("id")
    .eq("id", kasKeluarId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Kas keluar tidak ditemukan" },
      { status: 404 },
    );
  }

  // Guard: no_bukti unik (kecuali diri sendiri)
  const { data: duplicate, error: duplicateError } = await db
    .from("kas_keluar")
    .select("id")
    .eq("no_bukti", no_bukti)
    .neq("id", kasKeluarId)
    .single();

  if (duplicateError === null && duplicate) {
    return NextResponse.json(
      { error: "No bukti sudah dipakai" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("kas_keluar")
    .update({
      tanggal,
      no_bukti,
      tujuan,
      id_akun_kas,
      id_akun_beban,
      nominal,
      keterangan,
    })
    .eq("id", kasKeluarId)
    .select(
      "id,tanggal,no_bukti,tujuan,id_akun_kas,id_akun_beban,nominal,keterangan",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update kas keluar" },
      { status: 500 },
    );
  }

  const row: KasKeluarRow = {
    id: data.id as number,
    tanggal: data.tanggal as string,
    no_bukti: data.no_bukti as string,
    tujuan: data.tujuan as string,
    id_akun_kas: data.id_akun_kas as number,
    id_akun_beban: data.id_akun_beban as number,
    nominal: Number(data.nominal),
    keterangan: data.keterangan as string,
  };

  return NextResponse.json(row);
}

/* =========================
   DELETE: Delete Kas Keluar
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const kasKeluarId = Number(id);

  if (!Number.isInteger(kasKeluarId)) {
    return NextResponse.json(
      { error: "ID kas keluar tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("kas_keluar")
    .select("id")
    .eq("id", kasKeluarId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Kas keluar tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("kas_keluar").delete().eq("id", kasKeluarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
