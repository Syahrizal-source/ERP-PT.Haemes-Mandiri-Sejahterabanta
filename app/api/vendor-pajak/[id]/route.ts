import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { vendorPajakUpdateSchema } from "@/lib/validators/vendorPajak";

import type { VendorPajakUpdateInput } from "@/lib/validators/vendorPajak";

/* =========================
   TYPES
========================= */

type Params = {
  id: string;
};

type RouteContext = {
  params: Promise<Params>;
};

type VendorPajakRow = {
  id: number;
  vendor_id: number;
  npwp: string | null;
  nama_npwp: string | null;
  alamat_npwp: string | null;
  pkp: boolean;
};

/* =========================
   HELPERS
========================= */

function parsePajakId(id: string): number | null {
  const pajakId = Number(id);

  if (!Number.isSafeInteger(pajakId) || pajakId <= 0) {
    return null;
  }

  return pajakId;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan sistem";
}

/* =========================
   PUT - UPDATE PAJAK VENDOR
========================= */

export async function PUT(
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const pajakId = parsePajakId(id);

    if (pajakId === null) {
      return NextResponse.json(
        {
          error: "ID pajak vendor tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const body: unknown = await req.json();

    const parsed = vendorPajakUpdateSchema.safeParse(body);

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

    const payload: VendorPajakUpdateInput = parsed.data;

    const { data, error } = await db
      .from("vendor_pajak")
      .update(payload)
      .eq("id", pajakId)
      .select("id,vendor_id,npwp,nama_npwp,alamat_npwp,pkp")
      .maybeSingle();

    if (error) {
      console.error("UPDATE VENDOR PAJAK ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal memperbarui pajak vendor",
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: "Data pajak vendor tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    const result: VendorPajakRow = {
      id: data.id as number,
      vendor_id: data.vendor_id as number,
      npwp: data.npwp ?? null,
      nama_npwp: data.nama_npwp ?? null,
      alamat_npwp: data.alamat_npwp ?? null,
      pkp: data.pkp as boolean,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("UPDATE VENDOR PAJAK ERROR:", error);

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
   DELETE - VENDOR PAJAK
========================= */

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const pajakId = parsePajakId(id);

    if (pajakId === null) {
      return NextResponse.json(
        {
          error: "ID pajak vendor tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const { error } = await db.from("vendor_pajak").delete().eq("id", pajakId);

    if (error) {
      console.error("DELETE VENDOR PAJAK ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal menghapus pajak vendor",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pajak vendor berhasil dihapus",
    });
  } catch (error: unknown) {
    console.error("DELETE VENDOR PAJAK ERROR:", error);

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
