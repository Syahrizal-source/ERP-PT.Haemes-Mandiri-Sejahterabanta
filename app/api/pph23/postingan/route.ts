import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_pph23: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_beban_jasa: z.number().int().positive(),
      id_akun_hutang_pph23: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_pph23, id_periode, id_akun_beban_jasa, id_akun_hutang_pph23 } =
    parsed.data;

  const { data: pph23 } = await db
    .from("pph23")
    .select("id,jenis_jasa,nilai_transaksi,pph23_terutang,tanggal_transaksi")
    .eq("id", id_pph23)
    .single();

  if (!pph23) {
    return NextResponse.json(
      { error: "PPH23 tidak ditemukan" },
      { status: 404 },
    );
  }

  const nominal = Number(pph23.pph23_terutang);
  if (nominal <= 0) {
    return NextResponse.json(
      { error: "PPH23 terutang tidak valid" },
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

  const { data: header } = await db
    .from("jurnal")
    .insert({
      tanggal: pph23.tanggal_transaksi,
      no_bukti: `PPH23-${pph23.id}`,
      keterangan: `Posting PPh23 jasa ${pph23.jenis_jasa}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (!header) {
    return NextResponse.json(
      { error: "Gagal buat jurnal PPh23" },
      { status: 500 },
    );
  }

  const details = [
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_beban_jasa,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_hutang_pph23,
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

  const { error } = await db.from("jurnal_detail").insert(details);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id_jurnal: header.id_jurnal });
}
