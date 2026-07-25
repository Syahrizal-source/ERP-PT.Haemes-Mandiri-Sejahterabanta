import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { piutangInternalSchema } from "@/lib/validators/piutang-internal";
import { validateBalance } from "@/lib/validators/jurnal";

/* =========================
   TYPES
========================= */
type PiutangInternalRow = {
  id_piutang: number;
  tanggal: string;
  pihak: string;
  keterangan: string;
  nominal: number;
  status:
    | "Unpaid (Menunggu Pembayaran)"
    | "Partial (Pembayaran Sebagian)"
    | "Paid (Pembayaran Penuh/ Lunas)";
};

/* =========================
   GET: List Piutang Internal
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("piutang_internal")
    .select("id_piutang,tanggal,pihak,keterangan,nominal,status")
    .order("tanggal", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data piutang internal" },
      { status: 500 },
    );
  }

  const result: PiutangInternalRow[] = data.map((r) => ({
    id_piutang: r.id_piutang as number,
    tanggal: r.tanggal as string,
    pihak: r.pihak as string,
    keterangan: r.keterangan as string,
    nominal: Number(r.nominal),
    status: r.status as PiutangInternalRow["status"],
  }));

  return NextResponse.json(result);
}

/* =========================
   POST: Create Piutang Internal
   + Auto Posting Jurnal
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = piutangInternalSchema.parse(body);

    const { tanggal, pihak, keterangan, nominal } = parsed;

    /* 1️⃣ Ambil periode OPEN */
    const { data: periode } = await db
      .from("periode")
      .select("id_periode")
      .eq("status", "OPEN")
      .single();

    if (!periode) {
      return NextResponse.json(
        { error: "Periode aktif tidak ditemukan" },
        { status: 400 },
      );
    }

    /* 2️⃣ Ambil COA dari regulasi */
    const { data: regulasi } = await db
      .from("regulasi_akun")
      .select("akun_piutang, akun_kas")
      .single();

    if (!regulasi) {
      return NextResponse.json(
        { error: "Regulasi akun belum diset" },
        { status: 400 },
      );
    }

    /* 3️⃣ Insert piutang_internal */
    const { data: piutang } = await db
      .from("piutang_internal")
      .insert({
        tanggal,
        pihak,
        keterangan,
        nominal,
        status: "Unpaid (Menunggu Pembayaran)",
      })
      .select("id_piutang")
      .single();

    if (!piutang) {
      return NextResponse.json(
        { error: "Gagal insert piutang internal" },
        { status: 500 },
      );
    }

    /* 4️⃣ Insert jurnal */
    const { data: jurnal } = await db
      .from("jurnal")
      .insert({
        tanggal,
        no_bukti: `PI-${piutang.id_piutang}`,
        sumber: "PIUTANG_INTERNAL",
        keterangan: `Piutang Internal - ${pihak}`,
        id_periode: periode.id_periode,
      })
      .select("id_jurnal")
      .single();

    if (!jurnal) {
      return NextResponse.json(
        { error: "Gagal insert jurnal" },
        { status: 500 },
      );
    }

    /* 5️⃣ Validasi balance */
    validateBalance([
      { debit: nominal, kredit: 0 },
      { debit: 0, kredit: nominal },
    ]);

    /* 6️⃣ Insert jurnal_detail */
    await db.from("jurnal_detail").insert([
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: regulasi.akun_piutang,
        debit: nominal,
        kredit: 0,
      },
      {
        id_jurnal: jurnal.id_jurnal,
        id_coa: regulasi.akun_kas,
        debit: 0,
        kredit: nominal,
      },
    ]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("POST PIUTANG INTERNAL ERROR:", error);
    return NextResponse.json(
      { error: "Gagal simpan piutang internal" },
      { status: 400 },
    );
  }
}
