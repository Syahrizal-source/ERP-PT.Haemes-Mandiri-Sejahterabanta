import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

type PostingInput = {
  kas_masuk_id: number;
  id_periode: number;
};

type KasMasukRow = {
  id: number;
  tanggal: string;
  no_bukti: string;
  id_akun_kas: number;
  id_akun_lawan: number;
  nominal: number;
  keterangan: string;
};

type CoaRow = {
  id_coa: number;
  kode: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      kas_masuk_id: z.number().int().positive(),
      id_periode: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { kas_masuk_id, id_periode }: PostingInput = parsed.data;

  // 1️⃣ Ambil kas masuk
  const { data: kasMasuk, error: kasError } = await db
    .from("kas_masuk")
    .select("id,tanggal,no_bukti,id_akun_kas,id_akun_lawan,nominal,keterangan")
    .eq("id", kas_masuk_id)
    .single();

  if (kasError || !kasMasuk) {
    return NextResponse.json(
      { error: "Kas masuk tidak ditemukan" },
      { status: 404 },
    );
  }

  const row: KasMasukRow = {
    id: kasMasuk.id as number,
    tanggal: kasMasuk.tanggal as string,
    no_bukti: kasMasuk.no_bukti as string,
    id_akun_kas: kasMasuk.id_akun_kas as number,
    id_akun_lawan: kasMasuk.id_akun_lawan as number,
    nominal: Number(kasMasuk.nominal),
    keterangan: kasMasuk.keterangan as string,
  };

  if (row.nominal <= 0) {
    return NextResponse.json(
      { error: "Nominal kas masuk tidak valid" },
      { status: 400 },
    );
  }

  // 2️⃣ Cek periode
  const { data: periode, error: periodeError } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("id_periode", id_periode)
    .single();

  if (periodeError || !periode) {
    return NextResponse.json(
      { error: "Periode tidak ditemukan" },
      { status: 404 },
    );
  }

  if (periode.status === "CLOSED") {
    return NextResponse.json(
      { error: "Periode sudah CLOSED" },
      { status: 400 },
    );
  }

  // 3️⃣ Ambil COA kas & lawan
  const { data: coaRows, error: coaError } = await db
    .from("coa")
    .select("id_coa,kode")
    .in("id_coa", [row.id_akun_kas, row.id_akun_lawan]);

  if (coaError || !coaRows || coaRows.length < 2) {
    return NextResponse.json(
      { error: "COA kas / lawan tidak valid" },
      { status: 500 },
    );
  }

  const akunKas: CoaRow | undefined = coaRows.find(
    (c) => c.id_coa === row.id_akun_kas,
  );

  const akunLawan: CoaRow | undefined = coaRows.find(
    (c) => c.id_coa === row.id_akun_lawan,
  );

  if (!akunKas || !akunLawan) {
    return NextResponse.json(
      { error: "COA kas / lawan tidak ditemukan" },
      { status: 500 },
    );
  }

  // 4️⃣ Insert header jurnal
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: row.tanggal,
      no_bukti: row.no_bukti,
      keterangan: `Kas Masuk: ${row.keterangan}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal kas masuk" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  // 5️⃣ Detail jurnal (UT-safe)
  const details: {
    id_jurnal: number;
    id_coa: number;
    debit: number;
    kredit: number;
  }[] = [
    {
      id_jurnal,
      id_coa: akunKas.id_coa,
      debit: row.nominal,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: akunLawan.id_coa,
      debit: 0,
      kredit: row.nominal,
    },
  ];

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal kas masuk tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    kas_masuk_id: row.id,
  });
}
