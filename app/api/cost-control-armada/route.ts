import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

interface InsertBody {
  id_armada: number;
  tanggal: string;
  jenis_biaya: string;
  nominal: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body: InsertBody = await req.json();

    if (!Number.isInteger(body.id_armada) || body.id_armada <= 0) {
      return NextResponse.json(
        { error: "ID Armada tidak valid" },
        { status: 400 },
      );
    }

    if (!body.tanggal) {
      return NextResponse.json(
        { error: "Tanggal wajib diisi" },
        { status: 400 },
      );
    }

    if (!body.jenis_biaya || body.jenis_biaya.trim() === "") {
      return NextResponse.json(
        { error: "Jenis biaya wajib diisi" },
        { status: 400 },
      );
    }

    if (typeof body.nominal !== "number" || body.nominal < 0) {
      return NextResponse.json(
        { error: "Nominal tidak valid" },
        { status: 400 },
      );
    }

    // 🔎 cek armada exists
    const { data: armada, error: armadaError } = await db
      .from("armada")
      .select("id")
      .eq("id", body.id_armada)
      .single();

    if (armadaError || !armada) {
      return NextResponse.json(
        { error: "Armada tidak ditemukan" },
        { status: 400 },
      );
    }

    const { error } = await db.from("cost_control_armada").insert({
      id_armada: body.id_armada,
      tanggal: body.tanggal,
      jenis_biaya: body.jenis_biaya,
      nominal: body.nominal,
    });

    if (error) {
      console.error("Insert cost control error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
