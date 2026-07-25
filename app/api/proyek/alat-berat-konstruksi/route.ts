import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

/* =====================
   TYPE DEFINISI (FIX)
===================== */
type AlatBeratMaster = {
  id_alat: string;
  kategori: "ALAT_BERAT" | "TRUK" | "PEMADATAN" | "CRANE";
  merek: string;
  model: string;
  tahun: number;
  status: "aktif" | "nonaktif";
};

type ProyekAlatBeratRow = {
  id: string;
  id_proyek: string;
  id_alat: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  tarif_sewa_internal: number;
  jam_operasi: number;
};

type CreatePayload = Omit<ProyekAlatBeratRow, "id">;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = searchParams.get("id_proyek");

    if (!id_proyek) {
      return NextResponse.json(
        { error: "id_proyek wajib diisi" },
        { status: 400 },
      );
    }

    // Ambil transaksi proyek
    const { data: rows, error } = await db
      .from("proyek_alat_berat_konstruksi")
      .select("*")
      .eq("id_proyek", id_proyek)
      .order("tanggal_mulai", { ascending: true });

    if (error || !rows) throw error;

    // Ambil master alat berat
    const alatIds = rows.map((r) => r.id_alat);

    const { data: master } = await db
      .from("alat_berat_master")
      .select("*")
      .in("id_alat", alatIds);

    const result = rows.map((r) => ({
      ...r,
      alat_berat:
        master?.find((m: AlatBeratMaster) => m.id_alat === r.id_alat) ?? null,
    }));

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error("GET ALAT BERAT KONSTRUKSI ERROR:", e);
    return NextResponse.json(
      { error: "Gagal mengambil alat berat proyek" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePayload = await req.json();

    validatePositive(body.tarif_sewa_internal, "Tarif Sewa");
    validatePositive(body.jam_operasi, "Jam Operasi");

    const { error } = await db
      .from("proyek_alat_berat_konstruksi")
      .insert(body);

    if (error) throw error;

    return NextResponse.json({
      message: "Alat berat proyek berhasil ditambahkan",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
