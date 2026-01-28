import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type NeracaResult = {
  aset: number;
  ekuitas: number;
};

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("bank_statement")
    .select("saldo")
    .order("tanggal", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal ambil neraca" },
      { status: 500 },
    );
  }

  const saldo = Number(data.saldo);

  const result: NeracaResult = {
    aset: saldo,
    ekuitas: saldo,
  };

  return NextResponse.json(result);
}
