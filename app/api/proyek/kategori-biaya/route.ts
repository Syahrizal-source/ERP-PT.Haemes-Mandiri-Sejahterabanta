import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type KategoriBiayaProyek = {
  id: number;
  kode: string;
  nama: string;
  jenis: "BIAYA" | "MATERIAL";
  aktif: boolean;
};

export async function GET() {
  try {
    const { data, error } = await db
      .from("kategori_biaya_proyek")
      .select("id, kode, nama, jenis, aktif")
      .eq("aktif", true)
      .eq("jenis", "BIAYA")
      .order("kode", { ascending: true });

    if (error) {
      console.error("GET KATEGORI BIAYA PROYEK ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil kategori biaya proyek.",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    const result: KategoriBiayaProyek[] = (data ?? []).map((item) => ({
      id: Number(item.id),
      kode: item.kode,
      nama: item.nama,
      jenis: item.jenis,
      aktif: Boolean(item.aktif),
    }));

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("GET KATEGORI BIAYA PROYEK EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil kategori biaya proyek.",
      },
      { status: 500 },
    );
  }
}
