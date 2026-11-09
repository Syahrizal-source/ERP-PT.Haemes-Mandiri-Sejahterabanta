import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pegawaiSchema, type PegawaiInput } from "@/lib/validators/pegawai";

/* =========================
   GET PEGAWAI
========================= */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pegawai")
      .select("*")
      .order("nama", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], {
      status: 200,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengambil data pegawai";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

/* =========================
   POST TAMBAH PEGAWAI
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // =====================================
    // AMBIL REQUEST BODY
    // =====================================

    const body: unknown = await req.json();

    // =====================================
    // VALIDASI DATA
    // =====================================

    const parsed = pegawaiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data pegawai tidak valid",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const input: PegawaiInput = parsed.data;

    // =====================================
    // INSERT DATA PEGAWAI
    // =====================================

    const { data, error } = await db
      .from("pegawai")
      .insert(input)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Data pegawai gagal disimpan",
        },
        { status: 500 },
      );
    }

    // =====================================
    // RESPONSE BERHASIL
    // =====================================

    return NextResponse.json(
      {
        message: "Pegawai berhasil ditambahkan",
        data,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menambahkan pegawai";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
