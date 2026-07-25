import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { hutangLeasingSchema } from "@/lib/validators/hutang-leasing";

import type { HutangLeasingInput } from "@/types/leasing";

/* =========================
   TYPES
========================= */

type Params = {
  id: string;
};

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  success: boolean;

  message?: string;
}

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<Params>;
  },
): Promise<NextResponse<unknown | ErrorResponse>> {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from("hutang_leasing")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Data tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   PUT
========================= */

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<Params>;
  },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    const raw: unknown = await req.json();

    const parsed = hutangLeasingSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data leasing tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const body: HutangLeasingInput = parsed.data;

    const { error } = await db
      .from("hutang_leasing")
      .update(body)
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message: "Hutang leasing berhasil diupdate",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<Params>;
  },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id } = await params;

    const { error } = await db
      .from("hutang_leasing")
      .delete()
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message: "Hutang leasing berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      {
        status: 500,
      },
    );
  }
}
