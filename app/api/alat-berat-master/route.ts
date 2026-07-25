import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type AlatBeratMaster = {
  id_alat: string;
  kategori: "ALAT_BERAT" | "TRUK" | "PEMADATAN" | "CRANE";
  merek: string;
  model: string;
  tahun: number;
  status: "aktif" | "nonaktif";
};

export async function GET(_: NextRequest) {
  try {
    const { data, error } = await db
      .from("alat_berat_master")
      .select("*")
      .order("id_alat");

    if (error) throw error;

    const result: AlatBeratMaster[] = data ?? [];
    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("GET ALAT BERAT MASTER ERROR:", e);
    return NextResponse.json(
      { error: "Gagal mengambil master alat berat" },
      { status: 500 },
    );
  }
}
