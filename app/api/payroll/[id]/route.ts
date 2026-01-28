import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { payrollSchema } from "@/lib/validators/payroll";

type Params = { id: string };

type PayrollRow = {
  id: number;
  bulan: number;
  tahun: number;
  total_gaji: number;
  total_tunjangan: number;
  total_potongan: number;
};

function computeNet(p: PayrollRow): number {
  return (
    Number(p.total_gaji) + Number(p.total_tunjangan) - Number(p.total_potongan)
  );
}

/* =========================
   PUT: Update Payroll
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const payrollId = Number(id);

  if (!Number.isInteger(payrollId)) {
    return NextResponse.json(
      { error: "ID payroll tidak valid" },
      { status: 400 },
    );
  }

  const body: unknown = await req.json();
  const parsed = payrollSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { bulan, tahun, total_gaji, total_tunjangan, total_potongan } =
    parsed.data;

  // Guard: payroll harus ada
  const { data: existing, error: existingError } = await db
    .from("payroll")
    .select("id")
    .eq("id", payrollId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Payroll tidak ditemukan" },
      { status: 404 },
    );
  }

  // Guard: bulan + tahun unik (kecuali diri sendiri)
  const { data: duplicate, error: duplicateError } = await db
    .from("payroll")
    .select("id")
    .eq("bulan", bulan)
    .eq("tahun", tahun)
    .neq("id", payrollId)
    .single();

  if (duplicateError === null && duplicate) {
    return NextResponse.json(
      { error: "Payroll bulan & tahun ini sudah ada" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("payroll")
    .update({
      bulan,
      tahun,
      total_gaji,
      total_tunjangan,
      total_potongan,
    })
    .eq("id", payrollId)
    .select("id,bulan,tahun,total_gaji,total_tunjangan,total_potongan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal update payroll" },
      { status: 500 },
    );
  }

  const row: PayrollRow = {
    id: data.id as number,
    bulan: data.bulan as number,
    tahun: data.tahun as number,
    total_gaji: Number(data.total_gaji),
    total_tunjangan: Number(data.total_tunjangan),
    total_potongan: Number(data.total_potongan),
  };

  return NextResponse.json({
    ...row,
    net_gaji: computeNet(row), // 👈 computed
  });
}

/* =========================
   DELETE: Delete Payroll
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> },
): Promise<NextResponse> {
  const { id } = await params;
  const payrollId = Number(id);

  if (!Number.isInteger(payrollId)) {
    return NextResponse.json(
      { error: "ID payroll tidak valid" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await db
    .from("payroll")
    .select("id")
    .eq("id", payrollId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json(
      { error: "Payroll tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await db.from("payroll").delete().eq("id", payrollId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
