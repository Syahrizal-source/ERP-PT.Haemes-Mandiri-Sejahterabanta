import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_piutang: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_piutang: z.number().int().positive(),
      id_akun_pendapatan: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_piutang, id_periode, id_akun_piutang, id_akun_pendapatan } =
    parsed.data;

  const { data: piutang, error: piutangError } = await db
    .from("piutang")
    .select("id_piutang,tanggal,no_invoice,nilai")
    .eq("id_piutang", id_piutang)
    .single();

  if (piutangError || !piutang) {
    return NextResponse.json(
      { error: "Piutang tidak ditemukan" },
      { status: 404 },
    );
  }

  const nominal = Number(piutang.nilai);
  if (nominal <= 0) {
    return NextResponse.json(
      { error: "Nilai piutang tidak valid" },
      { status: 400 },
    );
  }

  const { data: periode } = await db
    .from("periode")
    .select("status")
    .eq("id_periode", id_periode)
    .single();

  if (!periode || periode.status === "CLOSED") {
    return NextResponse.json(
      { error: "Periode tidak valid / CLOSED" },
      { status: 400 },
    );
  }

  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: piutang.tanggal,
      no_bukti: piutang.no_invoice,
      keterangan: `Posting Piutang ${piutang.no_invoice}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: "Gagal buat jurnal piutang" },
      { status: 500 },
    );
  }

  const details = [
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_piutang,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_pendapatan,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit = details.reduce((s, d) => s + d.debit, 0);
  const totalKredit = details.reduce((s, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({ id_jurnal: header.id_jurnal });
}
