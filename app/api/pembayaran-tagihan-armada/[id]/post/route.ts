import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { db } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid("ID pembayaran tidak valid."),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PostPembayaranResult = {
  pembayaran_id: string;
  armada_id: number;
  id_jurnal: number;
  nominal: number;
  total_tagihan: number;
  total_pembayaran: number;
  sisa_tagihan: number;
  id_coa_hutang: number;
  id_coa_kas: number;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    void request;

    const params = await context.params;

    const parsed = paramsSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "ID pembayaran tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const pembayaranId = parsed.data.id;

    /* ========================================================
       POST VIA SUPABASE RPC
       ======================================================== */

    const { data, error } = await db.rpc("post_pembayaran_tagihan_armada", {
      p_pembayaran_id: pembayaranId,
    });

    if (error) {
      console.error("POST PEMBAYARAN ARMADA RPC ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 422 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Posting pembayaran tidak mengembalikan data.",
        },
        { status: 500 },
      );
    }

    const result = data[0] as PostPembayaranResult;

    /* ========================================================
       RESPONSE
       ======================================================== */

    return NextResponse.json({
      success: true,

      message: "Pembayaran tagihan Armada berhasil POSTED.",

      data: {
        pembayaran_id: result.pembayaran_id,

        armada_id: Number(result.armada_id),

        id_jurnal: Number(result.id_jurnal),

        nominal: Number(result.nominal),

        total_tagihan: Number(result.total_tagihan),

        total_pembayaran: Number(result.total_pembayaran),

        sisa_tagihan: Number(result.sisa_tagihan),

        coa: {
          hutang: {
            id_coa: Number(result.id_coa_hutang),
          },

          kas: {
            id_coa: Number(result.id_coa_kas),
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error(
      "POST /api/pembayaran-tagihan-armada/[id]/post ERROR:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal melakukan posting pembayaran Armada.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
