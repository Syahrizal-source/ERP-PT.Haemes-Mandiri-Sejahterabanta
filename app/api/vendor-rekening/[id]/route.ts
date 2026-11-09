import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { vendorRekeningUpdateSchema } from "@/lib/validators/vendorRekening";

import type { VendorRekeningUpdateInput } from "@/lib/validators/vendorRekening";

/* =========================
   TYPES
========================= */

type Params = {
  id: string;
};

type RouteContext = {
  params: Promise<Params>;
};

type VendorRekeningRow = {
  id: number;
  vendor_id: number;
  nama_bank: string;
  nomor_rekening: string;
  nama_rekening: string;
};

/* =========================
   HELPERS
========================= */

function parseRekeningId(id: string): number | null {
  const rekeningId = Number(id);

  if (!Number.isSafeInteger(rekeningId) || rekeningId <= 0) {
    return null;
  }

  return rekeningId;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan sistem";
}

/* =========================
   PUT - UPDATE REKENING
========================= */

export async function PUT(
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const rekeningId = parseRekeningId(id);

    if (rekeningId === null) {
      return NextResponse.json(
        {
          error: "ID rekening tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const body: unknown = await req.json();

    const parsed = vendorRekeningUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const payload: VendorRekeningUpdateInput = parsed.data;

    const { data, error } = await db
      .from("vendor_rekening")
      .update(payload)
      .eq("id", rekeningId)
      .select("id,vendor_id,nama_bank,nomor_rekening,nama_rekening")
      .maybeSingle();

    if (error) {
      console.error("UPDATE VENDOR REKENING ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal memperbarui rekening vendor",
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Data rekening vendor tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const result: VendorRekeningRow = {
      id: data.id as number,
      vendor_id: data.vendor_id as number,
      nama_bank: data.nama_bank as string,
      nomor_rekening: data.nomor_rekening as string,
      nama_rekening: data.nama_rekening as string,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("UPDATE VENDOR REKENING ERROR:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   DELETE - VENDOR REKENING
========================= */

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const rekeningId = parseRekeningId(id);

    if (rekeningId === null) {
      return NextResponse.json(
        {
          error: "ID rekening tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const { error } = await db
      .from("vendor_rekening")
      .delete()
      .eq("id", rekeningId);

    if (error) {
      console.error("DELETE VENDOR REKENING ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal menghapus rekening vendor",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data rekening vendor berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE VENDOR REKENING ERROR:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}
