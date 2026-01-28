import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasKeluarSchema } from "@/lib/validators/kas-keluar";

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
   GET: List Kas Keluar
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kas_keluar")
    .select(
      "id,tanggal,no_bukti,tujuan,id_akun_kas,id_akun_beban,nominal,keterangan",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data kas keluar" },
      { status: 500 },
    );
  }

  const result: KasKeluarRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_bukti: r.no_bukti as string,
    tujuan: r.tujuan as string,
    id_akun_kas: r.id_akun_kas as number,
    id_akun_beban: r.id_akun_beban as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Kas Keluar
========================= */
export async function POST(req: Request): Promise<NextResponse> {
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

  // Guard: no_bukti unik
  const { data: existing, error: existingError } = await db
    .from("kas_keluar")
    .select("id")
    .eq("no_bukti", no_bukti)
    .single();

  if (existingError === null && existing) {
    return NextResponse.json(
      { error: "No bukti sudah dipakai" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("kas_keluar")
    .insert({
      tanggal,
      no_bukti,
      tujuan,
      id_akun_kas,
      id_akun_beban,
      nominal,
      keterangan,
    })
    .select(
      "id,tanggal,no_bukti,tujuan,id_akun_kas,id_akun_beban,nominal,keterangan",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert kas keluar" },
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

  return NextResponse.json(row, { status: 201 });
}
