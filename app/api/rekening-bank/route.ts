import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RekeningBankRow = {
  id: number;
  id_coa: number;
  nama_bank: string;
  no_rekening: string;
  nama_pemilik: string;
  aktif: boolean;
  created_at: string;
};

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("rekening_bank")
      .select("*")
      .eq("aktif", true)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as RekeningBankRow[]);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
