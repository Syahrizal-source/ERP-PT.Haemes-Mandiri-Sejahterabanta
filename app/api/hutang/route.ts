import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { hutangSchema } from "@/lib/validators/hutang";

type HutangRow = {
  id_hutang: number;
  supplier: string;
  no_invoice: string;
  tanggal: string;
  jatuh_tempo: string;
  nilai: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
};

/* =========================
   GET: List Hutang
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("hutang")
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data hutang" },
      { status: 500 },
    );
  }

  const result: HutangRow[] = data.map((r) => ({
    id_hutang: r.id_hutang as number,
    supplier: r.supplier as string,
    no_invoice: r.no_invoice as string,
    tanggal: r.tanggal as string,
    jatuh_tempo: r.jatuh_tempo as string,
    nilai: Number(r.nilai),
    status: r.status as HutangRow["status"],
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Hutang + Jurnal
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = hutangSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { supplier, no_invoice, tanggal, jatuh_tempo, nilai, status } =
    parsed.data;

  /* ===============================
     1️⃣ Insert Hutang
  ================================ */
  const { data, error } = await db
    .from("hutang")
    .insert({
      supplier,
      no_invoice,
      tanggal,
      jatuh_tempo,
      nilai,
      status,
    })
    .select("id_hutang,supplier,no_invoice,tanggal,jatuh_tempo,nilai,status")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert hutang" },
      { status: 500 },
    );
  }

  /* ===============================
     2️⃣ Posting ke Jurnal
  ================================ */

  // Ambil akun BEBAN
  const { data: bebanAkun } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "5000")
    .single();

  if (!bebanAkun) {
    return NextResponse.json(
      { error: "Akun beban tidak ditemukan" },
      { status: 500 },
    );
  }

  // Ambil akun HUTANG USAHA
  const { data: hutangAkun } = await db
    .from("coa")
    .select("id_coa")
    .eq("kode", "21001")
    .single();

  if (!hutangAkun) {
    return NextResponse.json(
      { error: "Akun hutang tidak ditemukan" },
      { status: 500 },
    );
  }

  // Ambil periode OPEN
  const { data: periode } = await db
    .from("periode")
    .select("id_periode")
    .eq("status", "OPEN")
    .limit(1)
    .single();

  if (!periode) {
    return NextResponse.json(
      { error: "Periode OPEN tidak ditemukan" },
      { status: 500 },
    );
  }

  const noBukti = `HTG-${data.id_hutang}`;

  // Insert jurnal header
  const { data: jurnal, error: jurnalError } = await db
    .from("jurnal")
    .insert({
      tanggal,
      no_bukti: noBukti,
      sumber: "KAS_ARMADA",
      keterangan: `Hutang ke ${supplier}`,
      id_periode: periode.id_periode,
    })
    .select("id_jurnal")
    .single();

  if (jurnalError || !jurnal) {
    return NextResponse.json(
      { error: jurnalError?.message ?? "Gagal membuat jurnal" },
      { status: 400 },
    );
  }

  // Insert jurnal detail
  const { error: detailError } = await db.from("jurnal_detail").insert([
    {
      id_jurnal: jurnal.id_jurnal,
      id_coa: bebanAkun.id_coa,
      debit: nilai,
      kredit: 0,
    },
    {
      id_jurnal: jurnal.id_jurnal,
      id_coa: hutangAkun.id_coa,
      debit: 0,
      kredit: nilai,
    },
  ]);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
