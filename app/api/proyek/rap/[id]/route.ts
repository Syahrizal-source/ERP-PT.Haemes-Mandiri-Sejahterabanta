import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

/* =========================
   GET DETAIL RAP
========================= */
export async function GET(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params; // ✅ WAJIB await

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("rap_proyek")
      .select("*")
      .eq("id", id)
      .maybeSingle(); // ✅ aman

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET RAP ERROR:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/* =========================
   UPDATE RAP
========================= */
export async function PUT(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params; // ✅ WAJIB await
    const body = await req.json();

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { error } = await db
      .from("rap_proyek")
      .update({
        nama_item: body.nama_item,
        kategori: body.kategori,
        qty: Number(body.qty),
        harga: Number(body.harga),
        tanggal: body.tanggal,
        keterangan: body.keterangan,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "RAP berhasil diupdate",
    });
  } catch (err) {
    console.error("PUT RAP ERROR:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

/* =========================
   DELETE RAP
========================= */
export async function DELETE(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params; // ✅ WAJIB await

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { error } = await db.from("rap_proyek").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "RAP berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE RAP ERROR:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
