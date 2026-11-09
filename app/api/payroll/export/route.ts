import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { buildPayrollExcelWithQR } from "@/lib/export/payroll-export";

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

  const rows = data.map((p) => {
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
      net_gaji: computeNet(row),
    };
  });

  const buffer = await buildPayrollExcelWithQR(rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=payroll.xlsx",
    },
  });
}
