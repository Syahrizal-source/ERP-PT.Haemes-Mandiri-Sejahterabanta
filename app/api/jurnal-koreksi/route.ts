import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  jurnalKoreksiSchema,
  validateKoreksiLines,
  type JurnalKoreksiInput,
} from "@/lib/validators/jurnal-koreksi";

import { postJurnalKoreksi } from "@/lib/accounting/postJurnalKoreksi";

/* =========================
   TYPES
========================= */

interface JurnalKoreksiRow {
  id: number;
  id_jurnal_asal: number;
  id_jurnal_koreksi: number;
  alasan: string;
  created_at: string;
}

/* =========================
   GET
========================= */

export async function GET(): Promise<NextResponse> {
  try {
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
      .order("id", {
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

    return NextResponse.json((data ?? []) as JurnalKoreksiRow[]);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = jurnalKoreksiSchema.safeParse(body);

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

    const input: JurnalKoreksiInput = parsed.data;

    /* =========================
       VALIDASI ANTI MINUS
    ========================= */

    for (const line of input.lines) {
      if (line.debit < 0 || line.kredit < 0) {
        return NextResponse.json(
          {
            error: "Nilai debit/kredit tidak boleh minus",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =========================
       VALIDASI BALANCE
    ========================= */

    validateKoreksiLines(input.lines);

    /* =========================
       POST JURNAL
    ========================= */

    const jurnalId = await postJurnalKoreksi(input);

    return NextResponse.json({
      success: true,
      jurnal_id: jurnalId,
      message: "Jurnal koreksi berhasil dibuat",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
