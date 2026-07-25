import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface CostControlRow {
  tanggal: string;
  jenis_biaya: string;
  nominal: number;
  kode_transaksi: string;
  no_polisi: string;
  supir: string;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("cost_control_armada")
    .select(
      `
      tanggal,
      jenis_biaya,
      nominal,
      armada (
        kode_transaksi,
        no_polisi,
        supir
      )
    `,
    )
    .order("tanggal", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Gagal ambil cost control armada" },
      { status: 500 },
    );
  }

  const result: CostControlRow[] = (data ?? []).map((row) => ({
    tanggal: row.tanggal,
    jenis_biaya: row.jenis_biaya,
    nominal: Number(row.nominal),
    kode_transaksi: row.armada?.kode_transaksi ?? "",
    no_polisi: row.armada?.no_polisi ?? "",
    supir: row.armada?.supir ?? "",
  }));

  return NextResponse.json(result);
}
