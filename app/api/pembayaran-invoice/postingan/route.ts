import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      pembayaran_id: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_kas: z.number().int().positive(),
      id_akun_piutang: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { pembayaran_id, id_periode, id_akun_kas, id_akun_piutang } =
    parsed.data;

  const { data: bayar, error: bayarError } = await db
    .from("pembayaran_invoice")
    .select("id,tanggal,nominal,keterangan")
    .eq("id", pembayaran_id)
    .single();

  if (bayarError || !bayar) {
    return NextResponse.json(
      { error: "Pembayaran tidak ditemukan" },
      { status: 404 },
    );
  }

  const nominal = Number(bayar.nominal);

  if (nominal <= 0) {
    return NextResponse.json(
      { error: "Nominal pembayaran tidak valid" },
      { status: 400 },
    );
  }

  // Cek periode
  const { data: periode } = await db
    .from("periode")
    .select("id_periode,status")
    .eq("id_periode", id_periode)
    .single();

  if (!periode || periode.status === "CLOSED") {
    return NextResponse.json(
      { error: "Periode tidak valid / CLOSED" },
      { status: 400 },
    );
  }

  // Insert header jurnal
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: bayar.tanggal,
      no_bukti: `PAY-${pembayaran_id}`,
      keterangan: `Pembayaran invoice`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal pembayaran" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  const details = [
    {
      id_jurnal,
      id_coa: id_akun_kas,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: id_akun_piutang,
      debit: 0,
      kredit: nominal,
    },
  ];

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);
  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal pembayaran tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    pembayaran_id,
  });
}
