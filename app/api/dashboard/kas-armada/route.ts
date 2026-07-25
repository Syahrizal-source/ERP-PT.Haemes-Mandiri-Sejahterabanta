import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface KasArmadaRow {
  id: string;
  tanggal: string;
  sopir: string;
  penerimaan: number;
  pengeluaran: number;
}

export async function GET() {
  try {
    const { data, error } = await db
      .from("kas_armada")
      .select("id, tanggal, sopir, penerimaan, pengeluaran")
      .order("tanggal", { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const result: KasArmadaRow[] = data ?? [];

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}
