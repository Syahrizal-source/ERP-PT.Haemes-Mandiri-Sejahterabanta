import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  pendapatanSchema,
  type PendapatanInput,
} from "@/lib/validators/pendapatan";

/* =========================
   TYPES
========================= */

type Params = {
  params: Promise<{ id: string }>;
};

interface PendapatanRow {
  id: number;
  tanggal: string;
  id_coa: number;
  nominal: number;
  ppn: number;
  pph23: number;
  total: number;
  keterangan: string;
  id_jurnal: number | null;
}

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _req: NextRequest,
  context: Params,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pendapatanId: number = Number(id);

    const { data, error } = await db
      .from("pendapatan")
      .select("*")
      .eq("id", pendapatanId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message ?? "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    const result: PendapatanRow = data;

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   PUT
========================= */

export async function PUT(
  req: NextRequest,
  context: Params,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pendapatanId: number = Number(id);

    const body: unknown = await req.json();

    const parsed = pendapatanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data tidak valid" },
        { status: 400 },
      );
    }

    const input: PendapatanInput = parsed.data;

    /* =========================
       HITUNG ULANG
    ========================= */

    const nominal: number = input.nominal;

    const ppn: number = input.ppn ?? nominal * 0.11;
    const pph23: number = input.pph23 ?? nominal * 0.02;

    const total: number = nominal + ppn - pph23;

    if (total < 0) {
      return NextResponse.json(
        { message: "Total tidak boleh minus" },
        { status: 400 },
      );
    }

    /* =========================
       UPDATE
    ========================= */

    const { data, error } = await db
      .from("pendapatan")
      .update({
        tanggal: input.tanggal,
        id_coa: input.id_coa,
        nominal,
        ppn,
        pph23,
        total,
        keterangan: input.keterangan,
      })
      .eq("id", pendapatanId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message ?? "Gagal update" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Pendapatan berhasil diupdate",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  context: Params,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pendapatanId: number = Number(id);

    const { error } = await db
      .from("pendapatan")
      .delete()
      .eq("id", pendapatanId);

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Pendapatan berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { message: (error as Error).message },
      { status: 500 },
    );
  }
}