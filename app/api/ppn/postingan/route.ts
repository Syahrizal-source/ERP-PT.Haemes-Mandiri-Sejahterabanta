import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      id_ppn: z.number().int().positive(),
      id_periode: z.number().int().positive(),
      id_akun_debit: z.number().int().positive(),
      id_akun_kredit: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { id_ppn, id_periode, id_akun_debit, id_akun_kredit } = parsed.data;

  const { data: ppn } = await db
    .from("ppn")
    .select("id,jenis_ppn,nilai_ppn,tanggal_transaksi")
    .eq("id", id_ppn)
    .single();

  if (!ppn) {
    return NextResponse.json({ error: "PPN tidak ditemukan" }, { status: 404 });
  }

  const nominal = Number(ppn.nilai_ppn);
  if (nominal <= 0) {
    return NextResponse.json(
      { error: "Nilai PPN tidak valid" },
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
      tanggal: ppn.tanggal_transaksi,
      no_bukti: `PPN-${ppn.id}`,
      keterangan: `Posting PPN ${ppn.jenis_ppn}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (!header) {
    return NextResponse.json(
      { error: "Gagal buat jurnal PPN" },
      { status: 500 },
    );
  }

  const details = [
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_debit,
      debit: nominal,
      kredit: 0,
    },
    {
      id_jurnal: header.id_jurnal,
      id_coa: id_akun_kredit,
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
