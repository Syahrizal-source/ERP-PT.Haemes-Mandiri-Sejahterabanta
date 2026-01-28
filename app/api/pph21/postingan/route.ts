import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_pph21: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_beban_pajak: z.number().int().positive(),
      id_akun_hutang_pph21: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_pph21, id_periode, id_akun_beban_pajak, id_akun_hutang_pph21 } =
    parsed.data;

  const { data: pph, error: pphError } = await db
    .from("pph21")
    .select("id,nama,tanggal,nilai_pph21")
    .eq("id", id_pph21)
    .single();

  if (pphError || !pph) {
    return NextResponse.json(
      { error: "PPH21 tidak ditemukan" },
      { status: 404 },
    );
  }

  const nominal = Number(pph.nilai_pph21);
  if (nominal <= 0) {
    return NextResponse.json(
      { error: "Nilai PPH21 tidak valid" },
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
      tanggal: pph.tanggal,
      no_bukti: `PPH21-${pph.id}`,
      keterangan: `Posting PPh21 ${pph.nama}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: "Gagal buat jurnal PPh21" },
      { status: 500 },
    );
  }

  const details = [
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_beban_pajak,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_hutang_pph21,
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
