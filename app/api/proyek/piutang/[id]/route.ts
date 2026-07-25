import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { PiutangProyekAccounting } from "@/types/proyek";

import {
  piutangProyekSchema,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

/* =========================
   PARAMS
========================= */

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _: NextRequest,
  { params }: Params,
): Promise<Response> {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from("piutang_proyek")
      .select("*")
      .eq("id_piutang_proyek", Number(id))
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 404,
        },
      );
    }

    const result = data as PiutangProyekAccounting;

    return NextResponse.json(result);
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
   UPDATE
========================= */

export async function PUT(
  req: NextRequest,
  { params }: Params,
): Promise<Response> {
  try {
    const body: unknown = await req.json();

    const parsed = piutangProyekSchema.partial().parse(body);

    /* =========================
       GET EXISTING DATA
    ========================= */

    const { id } = await params;

    const { data: existing, error: existingError } = await db
      .from("piutang_proyek")
      .select("*")
      .eq("id_piutang_proyek", Number(id))
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Data piutang proyek tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================
       FINAL VALUE
    ========================= */

    const nilaiPiutang =
      parsed.nilai_piutang !== undefined
        ? Number(parsed.nilai_piutang)
        : Number(existing.nilai_piutang);

    const penerimaan =
      parsed.penerimaan !== undefined
        ? Number(parsed.penerimaan)
        : Number(existing.penerimaan);

    const saldo = nilaiPiutang - penerimaan;

    /* =========================
       RUMUS ANTI MINUS
    ========================= */

    if (saldo < 0) {
      return NextResponse.json(
        {
          error: "Saldo piutang tidak boleh minus",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================
       STATUS OTOMATIS
    ========================= */

    let status:
      | "Unpaid (Menunggu Pembayaran)"
      | "Partial (Pembayaran Sebagian)"
      | "Paid (Pembayaran Penuh/ Lunas)";

    if (saldo === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (penerimaan > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    /* =========================
       VALIDASI
    ========================= */

    validatePiutangProyek({
      tanggal: parsed.tanggal ?? existing.tanggal,

      customer: parsed.customer ?? existing.customer,

      tanggal_pembayaran:
        parsed.tanggal_pembayaran ?? existing.tanggal_pembayaran,

      nilai_piutang: nilaiPiutang,

      penerimaan: penerimaan,

      saldo,

      keterangan: parsed.keterangan ?? existing.keterangan,

      status,
    });

    /* =========================
       UPDATE
    ========================= */

    const updateData = {
      tanggal: parsed.tanggal ?? existing.tanggal,

      customer: parsed.customer ?? existing.customer,

      tanggal_pembayaran:
        parsed.tanggal_pembayaran ?? existing.tanggal_pembayaran,

      nilai_piutang: nilaiPiutang,

      penerimaan,

      keterangan: parsed.keterangan ?? existing.keterangan,

      status,
    };

    const { data, error } = await db
      .from("piutang_proyek")
      .update(updateData)
      .eq("id_piutang_proyek", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      message: "Piutang proyek berhasil diupdate",

      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 400,
      },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _: NextRequest,
  { params }: Params,
): Promise<Response> {
  try {
    const { id } = await params;

    const { error } = await db
      .from("piutang_proyek")
      .delete()
      .eq("id_piutang_proyek", Number(id));

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      message: "Piutang proyek berhasil dihapus",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menghapus data",
      },
      {
        status: 500,
      },
    );
  }
}
