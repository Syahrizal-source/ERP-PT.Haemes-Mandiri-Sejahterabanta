import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { payrollSchema } from "@/lib/validators/payroll";

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
   GET: List Payroll
========================= */
export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("payroll")
    .select("id,bulan,tahun,total_gaji,total_tunjangan,total_potongan")
    .order("tahun", { ascending: false })
    .order("bulan", { ascending: false });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal ambil data payroll" },
      { status: 500 },
    );
  }

  const result = data.map((p) => {
    const row: PayrollRow = {
      id: p.id as number,
      bulan: p.bulan as number,
      tahun: p.tahun as number,
      total_gaji: Number(p.total_gaji),
      total_tunjangan: Number(p.total_tunjangan),
      total_potongan: Number(p.total_potongan),
    };

    return {
      ...row,
      net_gaji: computeNet(row), // 👈 computed, bukan DB
    };
  });

  return NextResponse.json(result);
}

/* =========================
   POST: Create Payroll
========================= */
export async function POST(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json();
  const parsed = payrollSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(parsed.error.format(), { status: 400 });
  }

  const { bulan, tahun, total_gaji, total_tunjangan, total_potongan } =
    parsed.data;

  // Guard: bulan + tahun unik
  const { data: existing, error: existingError } = await db
    .from("payroll")
    .select("id")
    .eq("bulan", bulan)
    .eq("tahun", tahun)
    .single();

  if (existingError === null && existing) {
    return NextResponse.json(
      { error: "Payroll bulan & tahun ini sudah ada" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("payroll")
    .insert({
      bulan,
      tahun,
      total_gaji,
      total_tunjangan,
      total_potongan,
    })
    .select("id,bulan,tahun,total_gaji,total_tunjangan,total_potongan")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal insert payroll" },
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
