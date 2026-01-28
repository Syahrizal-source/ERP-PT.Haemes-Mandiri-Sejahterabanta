import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasMasukSchema } from "@/lib/validators/kas-masuk";

type Params = { id: string };

type KasMasukRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  sumber: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  keterangan: string;
};

/* =========================
   PUT: Update Kas Masuk
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const kasMasukId = Number(id);

  if (!Number.isInteger(kasMasukId)) {
    return NextResponse.json(
      { error: "ID kas masuk tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = kasMasukSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const {
    tanggal,
    no_bukti,
    sumber,
    id_akun_kas,
    id_akun_lawan,
    nominal,
    keterangan,
  } = parsed.data;

  // Guard: data harus ada
  const { data: existing, error: existingError } = await db
    .from("kas_masuk")
    .select("id")
    .eq("id", kasMasukId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Kas masuk tidak ditemukan" },
      { status: 404 },
    );
  }

  // Guard: no_bukti unik (kecuali diri sendiri)
  const { data: duplicate, error: duplicateError } = await db
    .from("kas_masuk")
    .select("id")
    .eq("no_bukti", no_bukti)
    .neq("id", kasMasukId)
    .single();

  if (duplicateError === null && duplicate) {
    return NextResponse.json(
      { error: "No bukti sudah dipakai" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("kas_masuk")
    .update({
      tanggal,
      no_bukti,
      sumber,
      id_akun_kas,
      id_akun_lawan,
      nominal,
      keterangan,
    })
    .eq("id", kasMasukId)
    .select(
      "id,tanggal,no_bukti,sumber,id_akun_kas,id_akun_lawan,nominal,keterangan",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update kas masuk" },
      { status: 500 },
    );
  }

  const row: KasMasukRow = {
    id: data.id as number,
    tanggal: data.tanggal as string,
    no_bukti: data.no_bukti as string,
    sumber: data.sumber as string,
    id_akun_kas: data.id_akun_kas as number,
    id_akun_lawan: data.id_akun_lawan as number,
    nominal: Number(data.nominal),
    keterangan: data.keterangan as string,
  };

  return NextResponse.json(row);
}

/* =========================
   DELETE: Delete Kas Masuk
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const kasMasukId = Number(id);

  if (!Number.isInteger(kasMasukId)) {
    return NextResponse.json(
      { error: "ID kas masuk tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("kas_masuk")
    .select("id")
    .eq("id", kasMasukId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Kas masuk tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("kas_masuk").delete().eq("id", kasMasukId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
