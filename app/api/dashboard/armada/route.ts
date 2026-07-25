import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface ArmadaRow {
  id: string;
  tanggal: string;
  kode: string;
  no_polisi: string;
  supir: string;
  tagihan: number;
}

export async function GET() {
  try {
    const { data, error } = await db
      .from("armada")
      .select("id, tanggal, kode, no_polisi, supir, tagihan")
      .order("tanggal", { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const result: ArmadaRow[] = data ?? [];

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}
