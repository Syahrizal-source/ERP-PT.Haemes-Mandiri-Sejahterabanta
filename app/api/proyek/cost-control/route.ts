import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");
    const idKategori = searchParams.get("id_kategori");
    const status = searchParams.get("status");

    let query = db
      .from("v_cost_control")
      .select("*")
      .order("kode_kategori", { ascending: true })
      .order("uraian", { ascending: true });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    if (idKategori) {
      query = query.eq("id_kategori", Number(idKategori));
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan server.",
      },
      {
        status: 500,
      },
    );
  }
}
