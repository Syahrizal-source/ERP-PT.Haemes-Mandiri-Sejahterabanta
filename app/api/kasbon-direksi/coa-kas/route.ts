import { NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type CoaKasResponse = {
  id_coa: number;
  kode: string;
  nama: string;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("coa")
    .select("id_coa, kode, nama")
    .eq("aktif", true)
    .eq("is_cash", true)
    .eq("is_header", false)
    .order("kode", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: `Gagal mengambil akun kas/bank: ${error.message}`,
      },
      { status: 500 },
    );
  }

  const result: CoaKasResponse[] = (data ?? [])
    .map((item) => ({
      id_coa: Number(item.id_coa),
      kode: String(item.kode),
      nama: String(item.nama),
    }))
    .filter((item) => Number.isInteger(item.id_coa) && item.id_coa > 0);

  return NextResponse.json(result);
}
