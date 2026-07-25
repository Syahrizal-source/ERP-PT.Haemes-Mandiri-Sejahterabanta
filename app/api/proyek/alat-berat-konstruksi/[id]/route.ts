import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Context = {
  params: Promise<{ id: string }>;
};

/* =====================
   GET DETAIL
===================== */
export async function GET(
  _: NextRequest,
  context: Context,
) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_alat_berat_konstruksi")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil detail alat berat" },
      { status: 500 },
    );
  }
}

/* =====================
   UPDATE
===================== */
export async function PUT(
  req: NextRequest,
  context: Context,
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.tarif_sewa_internal !== undefined) {
      validatePositive(body.tarif_sewa_internal, "Tarif");
    }

    if (body.jam_operasi !== undefined) {
      validatePositive(body.jam_operasi, "Jam Operasi");
    }

    const { error } = await db
      .from("proyek_alat_berat_konstruksi")
      .update(body)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Alat berat berhasil diupdate",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}

/* =====================
   DELETE
===================== */
export async function DELETE(
  _: NextRequest,
  context: Context,
) {
  try {
    const { id } = await context.params;

    const { error } = await db
      .from("proyek_alat_berat_konstruksi")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Alat berat berhasil dihapus",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus alat berat" },
      { status: 500 },
    );
  }
}