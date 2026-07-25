import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.id_periode === "undefined") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const id_periode = Number(body.id_periode);

    if (!Number.isInteger(id_periode)) {
      return NextResponse.json(
        { error: "id_periode tidak valid" },
        { status: 400 },
      );
    }

    await db
      .from("periode")
      .update({ is_closed: false })
      .eq("id_periode", id_periode);

    return NextResponse.json({
      message: "Periode berhasil dibuka kembali",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
