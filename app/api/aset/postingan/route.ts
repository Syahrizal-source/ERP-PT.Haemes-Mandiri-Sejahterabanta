import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

type PostingInput = {
  id_aset: number;
  id_periode: number;
  id_akun_aset: number;
  id_akun_lawan: number;
};

type AsetRow = {
  id_aset: number;
  nama: string;
  nilai_perolehan: number;
  tanggal_perolehan: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_aset: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_aset: z.number().int().positive(),
      id_akun_lawan: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_aset, id_periode, id_akun_aset, id_akun_lawan } = parsed.data;

  const { data: aset, error: asetError } = await db
    .from("aset")
    .select("id_aset,nama,nilai_perolehan,tanggal_perolehan")
    .eq("id_aset", id_aset)
    .single();

  if (asetError || !aset) {
    return NextResponse.json(
      { error: "Aset tidak ditemukan" },
      { status: 404 },
    );
  }

  const row: AsetRow = {
    id_aset: aset.id_aset as number,
    nama: aset.nama as string,
    nilai_perolehan: Number(aset.nilai_perolehan),
    tanggal_perolehan: aset.tanggal_perolehan as string,
  };

  if (row.nilai_perolehan <= 0) {
    return NextResponse.json(
      { error: "Nilai perolehan tidak valid" },
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
      tanggal: row.tanggal_perolehan,
      no_bukti: `AST-${row.id_aset}`,
      keterangan: `Perolehan Aset: ${row.nama}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal aset" },
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
      id_coa: id_akun_aset,
      debit: row.nilai_perolehan,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: id_akun_lawan,
      debit: 0,
      kredit: row.nilai_perolehan,
    },
  ];

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal aset tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    id_aset: row.id_aset,
  });
}
