import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { pegawaiSchema, type PegawaiInput } from "@/lib/validators/pegawai";

/* =========================
   TYPES
========================= */

type Context = {
  params: Promise<{ id: string }>;
};

interface PegawaiRow {
  id: number;
  nik: string;
  nama: string;
  divisi: string;
  jabatan: string;
  gaji_pokok: number;
  tunjangan: number;
  status: string;
  created_at: string;
}

/* =========================
   GET BY ID
========================= */

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pegawaiId: number = Number(id);

    const { data, error } = await db
      .from("pegawai")
      .select("*")
      .eq("id", pegawaiId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: PegawaiRow = data;

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pegawaiId: number = Number(id);

    const body: unknown = await req.json();

    const parsed = pegawaiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const input: PegawaiInput = parsed.data;

    const { data, error } = await db
      .from("pegawai")
      .update({
        nik: input.nik,
        nama: input.nama,
        divisi: input.divisi,
        jabatan: input.jabatan,
        gaji_pokok: input.gaji_pokok,
        tunjangan: input.tunjangan,
        status: input.status,
      })
      .eq("id", pegawaiId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Gagal update pegawai" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Pegawai berhasil diupdate",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pegawaiId: number = Number(id);

    const { error } = await db.from("pegawai").delete().eq("id", pegawaiId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Pegawai berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
