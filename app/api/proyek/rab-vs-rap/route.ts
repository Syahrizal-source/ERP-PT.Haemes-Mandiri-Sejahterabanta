import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Row = {
  kategori: string;
  nama_item: string;
  total_rab: number;
  total_rap: number;
  selisih: number;
  status: "AMAN" | "OVER";
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = String(searchParams.get("id_proyek") ?? "");

    if (!id_proyek) {
      return NextResponse.json({ error: "id_proyek wajib" }, { status: 400 });
    }

    /* =========================
       AMBIL RAB
    ========================= */
    const { data: rab } = await db
      .from("proyek_rab")
      .select("*")
      .eq("id_proyek", id_proyek);

    /* =========================
       AMBIL RAP
    ========================= */
    const { data: rap } = await db
      .from("rap_proyek")
      .select("*")
      .eq("id_proyek", id_proyek);

    const map = new Map<string, Row>();

    /* =========================
       PROCESS RAB
    ========================= */
    for (const r of rab ?? []) {
      const key = `${r.kategori}-${r.uraian}`;

      const total = Number(r.volume) * Number(r.harga_satuan);

      map.set(key, {
        kategori: r.kategori,
        nama_item: r.uraian,
        total_rab: total,
        total_rap: 0,
        selisih: 0,
        status: "AMAN",
      });
    }

    /* =========================
       PROCESS RAP
    ========================= */
    for (const r of rap ?? []) {
      const key = `${r.kategori}-${r.nama_item}`;

      const total = Number(r.qty) * Number(r.harga);

      const existing = map.get(key);

      if (existing) {
        existing.total_rap += total;
      } else {
        map.set(key, {
          kategori: r.kategori,
          nama_item: r.nama_item,
          total_rab: 0,
          total_rap: total,
          selisih: 0,
          status: "OVER",
        });
      }
    }

    /* =========================
       HITUNG SELISIH
    ========================= */
    const result: Row[] = [];

    for (const val of map.values()) {
      const selisih = val.total_rap - val.total_rab;

      result.push({
        ...val,
        selisih,
        status: selisih > 0 ? "OVER" : "AMAN",
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal hitung RAB vs RAP" },
      { status: 500 },
    );
  }
}
