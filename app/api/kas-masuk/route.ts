import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { kasMasukSchema } from "@/lib/validators/kas-masuk";

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
   GET: List Kas Masuk
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("kas_masuk")
    .select(
      "id,tanggal,no_bukti,sumber,id_akun_kas,id_akun_lawan,nominal,keterangan",
    )
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data kas masuk" },
      { status: 500 },
    );
  }

  const result: KasMasukRow[] = data.map((r) => ({
    id: r.id as number,
    tanggal: r.tanggal as string,
    no_bukti: r.no_bukti as string,
    sumber: r.sumber as string,
    id_akun_kas: r.id_akun_kas as number,
    id_akun_lawan: r.id_akun_lawan as number,
    nominal: Number(r.nominal),
    keterangan: r.keterangan as string,
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Kas Masuk
========================= */
export async function POST(req: Request): Promise<NextResponse> {
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

  // Guard: no_bukti unik
  const { data: existing, error: existingError } = await db
    .from("kas_masuk")
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
    .from("kas_masuk")
    .insert({
      tanggal,
      no_bukti,
      sumber,
      id_akun_kas,
      id_akun_lawan,
      nominal,
      keterangan,
    })
    .select(
      "id,tanggal,no_bukti,sumber,id_akun_kas,id_akun_lawan,nominal,keterangan",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert kas masuk" },
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

  return NextResponse.json(row, { status: 201 });
}
