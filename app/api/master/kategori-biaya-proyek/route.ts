import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await db
      .from("kategori_biaya_proyek")
      .select("*")
      .eq("aktif", true)
      .order("jenis", { ascending: true })
      .order("nama", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengambil kategori biaya.",
      },
      { status: 500 },
    );
  }
}
