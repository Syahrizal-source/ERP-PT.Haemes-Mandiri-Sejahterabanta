import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

type PostingInput = {
  pendapatan_id: number;
  id_periode: number;
  id_akun_kas: number;
};

type PendapatanRow = {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  keterangan: string;
};

type CoaRow = {
  id_coa: number;
};

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      pendapatan_id: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_kas: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { pendapatan_id, id_periode, id_akun_kas } = parsed.data;

  const { data: pendapatan, error: pendapatanError } = await db
    .from("pendapatan")
    .select("id,tanggal,id_coa,nominal,keterangan")
    .eq("id", pendapatan_id)
    .single();

  if (pendapatanError || !pendapatan) {
    return NextResponse.json(
      { error: "Pendapatan tidak ditemukan" },
      { status: 404 },
    );
  }

  const row: PendapatanRow = {
    id: pendapatan.id as number,
    tanggal: pendapatan.tanggal as string,
    id_coa: pendapatan.id_coa as number,
    nominal: Number(pendapatan.nominal),
    keterangan: pendapatan.keterangan as string,
  };

  if (row.nominal <= 0) {
    return NextResponse.json(
      { error: "Nominal pendapatan tidak valid" },
      { status: 400 },
    );
  }

  // Cek periode
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

  // Insert header jurnal
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: row.tanggal,
      no_bukti: `REV-${row.id}`,
      keterangan: `Pendapatan: ${row.keterangan}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal pendapatan" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  const details: {
    id_jurnal: number;
    id_coa: number;
    debit: number;
    kredit: number;
  }[] = [
    {
      id_jurnal,
      id_coa: id_akun_kas,
      debit: row.nominal,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: row.id_coa,
      debit: 0,
      kredit: row.nominal,
    },
  ];

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal pendapatan tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    pendapatan_id: row.id,
  });
}
