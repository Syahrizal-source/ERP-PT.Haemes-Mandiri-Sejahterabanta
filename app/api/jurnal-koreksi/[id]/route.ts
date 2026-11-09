import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/supabase/server";

/* =========================
   TYPES
========================= */

type Params = {
  id: string;
};

type RouteContext = {
  params: Promise<Params>;
};

/* =========================
   VALIDATION
========================= */

const updateJurnalKoreksiSchema = z.object({
  alasan: z.string().trim().min(3, "Alasan koreksi minimal 3 karakter"),
});

/* =========================
   HELPERS
========================= */

function parseRecordId(id: string): number | null {
  const parsedId = Number(id);

  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan sistem";
}

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const recordId = parseRecordId(id);

    if (recordId === null) {
      return NextResponse.json(
        { error: "ID jurnal koreksi tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("jurnal_koreksi")
      .select(
        `
          id,
          id_jurnal_asal,
          id_jurnal_koreksi,
          alasan,
          created_at
        `,
      )
      .eq("id", recordId)
      .maybeSingle();

    if (error) {
      console.error("GET JURNAL KOREKSI ERROR:", error);

      return NextResponse.json(
        { error: "Gagal mengambil data jurnal koreksi" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Data jurnal koreksi tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("GET JURNAL KOREKSI ERROR:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

/* =========================
   PUT - UPDATE ALASAN
========================= */

export async function PUT(
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const recordId = parseRecordId(id);

    if (recordId === null) {
      return NextResponse.json(
        { error: "ID jurnal koreksi tidak valid" },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();
    const parsed = updateJurnalKoreksiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("jurnal_koreksi")
      .update({
        alasan: parsed.data.alasan,
      })
      .eq("id", recordId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("UPDATE JURNAL KOREKSI ERROR:", error);

      return NextResponse.json(
        { error: "Gagal memperbarui alasan jurnal koreksi" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Data jurnal koreksi tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alasan jurnal koreksi berhasil diperbarui",
    });
  } catch (error: unknown) {
    console.error("UPDATE JURNAL KOREKSI ERROR:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE
========================= */

/*
  Penghapusan relasi jurnal koreksi tidak dilakukan di sini.

  Tabel jurnal_koreksi menghubungkan jurnal asal dengan jurnal
  koreksi yang sudah dibuat. Menghapus relasi saja dapat
  meninggalkan jurnal koreksi posted tanpa hubungan historis.

  Penghapusan harus mengikuti prosedur pembatalan/reversal
  akuntansi yang berlaku, bukan menghapus relasinya saja.
*/

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error:
        "Penghapusan relasi jurnal koreksi dinonaktifkan. Gunakan prosedur pembatalan jurnal sesuai aturan akuntansi.",
    },
    { status: 409 },
  );
}
