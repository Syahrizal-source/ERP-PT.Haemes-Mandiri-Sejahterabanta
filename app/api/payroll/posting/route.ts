import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

type PostingInput = {
  payroll_id: number;
  id_periode: number;
};

type PayrollRow = {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
};

type CoaRow = {
  id_coa: number;
  kode: string;
};

export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = z
    .object({
      payroll_id: z.number().int().positive(),
      id_periode: z.number().int().positive(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { payroll_id, id_periode }: PostingInput = parsed.data;

  // 1️⃣ Ambil payroll
  const { data: payroll, error: payrollError } = await db
    .from("payroll")
    .select("id,bulan,tahun,total_gaji,total_tunjangan,total_potongan")
    .eq("id", payroll_id)
    .single();

  if (payrollError || !payroll) {
    return NextResponse.json(
      { error: "Payroll tidak ditemukan" },
      { status: 404 },
    );
  }

  const payrollRow: PayrollRow = {
    id: payroll.id as number,
    bulan: payroll.bulan as number,
    tahun: payroll.tahun as number,
    total_gaji: Number(payroll.total_gaji),
    total_tunjangan: Number(payroll.total_tunjangan),
    total_potongan: Number(payroll.total_potongan),
  };

  const totalBruto = payrollRow.total_gaji + payrollRow.total_tunjangan;

  const netGaji = totalBruto - payrollRow.total_potongan;

  if (netGaji < 0) {
    return NextResponse.json(
      { error: "Net gaji tidak valid" },
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

  // 3️⃣ Ambil COA wajib
  const { data: coaRows, error: coaError } = await db
    .from("coa")
    .select("id_coa,kode")
    .in("kode", ["61001", "23001", "11001"]);

  if (coaError || !coaRows || coaRows.length < 3) {
    return NextResponse.json(
      { error: "COA gaji belum lengkap" },
      { status: 500 },
    );
  }

  const bebanGaji = coaRows.find((c) => c.kode === "61001");

  const hutangGaji: CoaRow | undefined = coaRows.find(
    (c) => c.kode === "23001",
  );

  const kas: CoaRow | undefined = coaRows.find((c) => c.kode === "11001");

  if (!bebanGaji || !hutangGaji || !kas) {
    return NextResponse.json(
      { error: "COA gaji tidak valid" },
      { status: 500 },
    );
  }

  // 4️⃣ Insert header jurnal gaji
  const { data: header, error: headerError } = await db
    .from("jurnal")
    .insert({
      tanggal: new Date().toISOString().slice(0, 10),
      no_bukti: `PAY-${payrollRow.bulan}-${payrollRow.tahun}`,
      keterangan: `Jurnal Gaji ${payrollRow.bulan}/${payrollRow.tahun}`,
      id_periode,
      sumber: "UMUM",
    })
    .select("id_jurnal")
    .single();

  if (headerError || !header) {
    return NextResponse.json(
      { error: headerError?.message ?? "Gagal insert jurnal gaji" },
      { status: 500 },
    );
  }

  const id_jurnal: number = header.id_jurnal;

  // 5️⃣ Detail jurnal gaji (UT-safe)
  const details: {
    id_jurnal: number;
    id_coa: number;
    debit: number;
    kredit: number;
  }[] = [
    {
      id_jurnal,
      id_coa: bebanGaji.id_coa,
      debit: totalBruto,
      kredit: 0,
    },
    {
      id_jurnal,
      id_coa: hutangGaji.id_coa,
      debit: 0,
      kredit: totalBruto,
    },
  ];

  if (payrollRow.total_potongan > 0) {
    details.push(
      {
        id_jurnal,
        id_coa: kas.id_coa,
        debit: 0,
        kredit: payrollRow.total_potongan,
      },
      {
        id_jurnal,
        id_coa: hutangGaji.id_coa,
        debit: payrollRow.total_potongan,
        kredit: 0,
      },
    );
  }

  const totalDebit = details.reduce((s: number, d) => s + d.debit, 0);

  const totalKredit = details.reduce((s: number, d) => s + d.kredit, 0);

  if (totalDebit !== totalKredit) {
    return NextResponse.json(
      { error: "Jurnal gaji tidak balance" },
      { status: 500 },
    );
  }

  const { error: detailError } = await db.from("jurnal_detail").insert(details);

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
  }

  return NextResponse.json({
    id_jurnal,
    net_gaji: netGaji,
  });
}
