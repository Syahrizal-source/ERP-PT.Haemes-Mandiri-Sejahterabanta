import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  jurnalKoreksiSchema,
  validateKoreksiLines,
  type JurnalKoreksiInput,
} from "@/lib/validators/jurnal-koreksi";

/* =========================
   TYPES
========================= */

type Params = {
  id: string;
};

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
): Promise<NextResponse> {
  try {
    const { id } = await params;

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
      .eq("id", Number(id))
      .limit(1)
      .maybeSingle();

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

    if (!data) {
      return NextResponse.json(
        {
          error: "Data tidak ditemukan",
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
        error: error instanceof Error ? error.message : "Unknown error",
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
): Promise<NextResponse> {
  try {
    const { id } = await params;

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
       ANTI MINUS
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

    validateKoreksiLines(input.lines);

    const { error } = await db
      .from("jurnal_koreksi")
      .update({
        alasan: input.alasan,
      })
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
      message: "Jurnal koreksi berhasil diupdate",
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
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const { error } = await db
      .from("jurnal_koreksi")
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
      message: "Jurnal koreksi berhasil dihapus",
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
