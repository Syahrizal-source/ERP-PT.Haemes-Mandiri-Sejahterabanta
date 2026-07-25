import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  hutangLeasingSchema,
  normalizeHutangLeasing,
  validateLeasing,
  hitungLeasing,
} from "@/lib/validators/hutang-leasing";

import { postHutangLeasing } from "@/lib/accounting/postHutangLeasing";

import type { HutangLeasingInput } from "@/types/leasing";

/* =========================
   TYPES
========================= */

interface HutangLeasingRow extends HutangLeasingInput {
  id: number;

  created_at: string;
}

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  success: boolean;

  message: string;

  data?: unknown;
}

/* =========================
   GET
========================= */

export async function GET(): Promise<
  NextResponse<HutangLeasingRow[] | ErrorResponse>
> {
  try {
    const { data, error } = await db
      .from("hutang_leasing")
      .select("*")
      .order("tanggal", {
        ascending: false,
      });

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

    return NextResponse.json((data ?? []) as HutangLeasingRow[]);
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
   POST
========================= */

export async function POST(
  req: NextRequest,
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const raw: unknown = await req.json();

    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json(
        {
          error: "Body tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    const body = raw as HutangLeasingInput;

    /* =========================
       VALIDASI
    ========================= */

    const parsed = hutangLeasingSchema.safeParse(body);

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

    /* =========================
       NORMALIZE
    ========================= */

    const dataNorm = normalizeHutangLeasing(parsed.data);

    /* =========================
       VALIDATE BUSINESS
    ========================= */

    validateLeasing(dataNorm);

    /* =========================
       HITUNG
    ========================= */

    const hitung = hitungLeasing(dataNorm);

    /* =========================
       INSERT LEASING
    ========================= */

    const { data, error } = await db
      .from("hutang_leasing")
      .insert({
        ...dataNorm,

        angsuran_perbulan: hitung.angsuranPerBulan,

        sisa_hutang: hitung.sisaHutang,

        hutang_jangka_pendek: hitung.sisaJangkaPendek,

        hutang_jangka_panjang: hitung.sisaJangkaPanjang,

        status: "OPEN",
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message ?? "Gagal menyimpan leasing",
        },
        {
          status: 500,
        },
      );
    }

    /* =========================
       AUTO JURNAL
    ========================= */

    try {
      await postHutangLeasing(dataNorm);

      await db
        .from("hutang_leasing")
        .update({
          status: "ACTIVE",
        })
        .eq("id", Number(data.id));
    } catch (error: unknown) {
      console.error("POST LEASING ERROR:", error);

      await db
        .from("hutang_leasing")
        .update({
          status: "ERROR",
        })
        .eq("id", Number(data.id));

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Gagal membuat jurnal leasing",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message: "Hutang leasing berhasil dibuat",

      data,
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
