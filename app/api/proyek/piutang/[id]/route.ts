import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import type { StatusPiutangProyek } from "@/types/proyek";

import {
  piutangProyekSchema,
  validatePiutangProyek,
} from "@/lib/validators/piutang-proyek";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type PiutangProyekResponse = {
  id_piutang_proyek: number;
  id_proyek: string;
  id_tagihan: string;
  tanggal: string;
  customer: string;
  tanggal_pembayaran: string | null;
  nilai_piutang: number;
  penerimaan: number;
  saldo: number;
  keterangan: string | null;
  status: StatusPiutangProyek;
  is_posted: boolean;
  id_jurnal: number | null;
  created_at: string;
  updated_at: string;
};

// =====================================================
// GET DETAIL PIUTANG
// =====================================================

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const idPiutang = Number(id);

    if (!Number.isInteger(idPiutang) || idPiutang <= 0) {
      return NextResponse.json(
        {
          error: "ID piutang proyek tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("piutang_proyek")
      .select(
        `
    id_piutang_proyek,
    id_proyek,
    id_tagihan,
    tanggal,
    customer,
    tanggal_pembayaran,
    nilai_piutang,
    penerimaan,
    saldo,
    keterangan,
    status,
    is_posted,
    created_at,
    updated_at,
    id_jurnal
  `,
      )
      .eq("id_piutang_proyek", idPiutang)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: "Piutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    const result: PiutangProyekResponse = {
      id_piutang_proyek: Number(data.id_piutang_proyek),
      id_proyek: data.id_proyek,
      id_tagihan: data.id_tagihan,
      tanggal: data.tanggal,
      customer: data.customer,
      tanggal_pembayaran: data.tanggal_pembayaran,
      nilai_piutang: Number(data.nilai_piutang),
      penerimaan: Number(data.penerimaan),
      saldo: Number(data.saldo),
      keterangan: data.keterangan,
      status: data.status as StatusPiutangProyek,
      is_posted: Boolean(data.is_posted),
      id_jurnal: data.id_jurnal === null ? null : Number(data.id_jurnal),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET DETAIL PIUTANG ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail piutang proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

// =====================================================
// UPDATE PIUTANG
// =====================================================

export async function PUT(
  req: NextRequest,
  context: Context,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const idPiutang = Number(id);

    if (!Number.isInteger(idPiutang) || idPiutang <= 0) {
      return NextResponse.json(
        {
          error: "ID piutang proyek tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // REQUEST
    // =================================================

    const body: unknown = await req.json();

    const parsed = piutangProyekSchema.partial().parse(body);

    // =================================================
    // AMBIL DATA EXISTING
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("piutang_proyek")
      .select(
        `
          id_piutang_proyek,
          id_proyek,
          id_tagihan,
          tanggal,
          customer,
          tanggal_pembayaran,
          nilai_piutang,
          penerimaan,
          saldo,
          keterangan,
          status,
          is_posted,
          id_jurnal
        `,
      )
      .eq("id_piutang_proyek", idPiutang)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Piutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // NILAI FINAL
    // =================================================

    const nilaiPiutang =
      parsed.nilai_piutang !== undefined
        ? Number(parsed.nilai_piutang)
        : Number(existing.nilai_piutang);

    const penerimaan =
      parsed.penerimaan !== undefined
        ? Number(parsed.penerimaan)
        : Number(existing.penerimaan);

    if (!Number.isFinite(nilaiPiutang) || nilaiPiutang < 0) {
      throw new Error("Nilai piutang tidak valid.");
    }

    if (!Number.isFinite(penerimaan) || penerimaan < 0) {
      throw new Error("Penerimaan tidak valid.");
    }

    // =================================================
    // SALDO
    //
    // Jangan disimpan ke database.
    // Database menghitung sendiri.
    // =================================================

    const saldo = nilaiPiutang - penerimaan;

    if (saldo < 0) {
      throw new Error("Penerimaan tidak boleh melebihi nilai piutang.");
    }

    // =================================================
    // STATUS OTOMATIS
    // =================================================

    let status: StatusPiutangProyek;

    if (saldo === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (penerimaan > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    // =================================================
    // VALIDASI DENGAN SCHEMA FINAL
    // =================================================

    validatePiutangProyek({
      id_proyek: existing.id_proyek,
      id_tagihan: existing.id_tagihan,

      tanggal: parsed.tanggal ?? existing.tanggal,

      customer: parsed.customer ?? existing.customer,

      tanggal_pembayaran:
        parsed.tanggal_pembayaran ?? existing.tanggal_pembayaran,

      nilai_piutang: nilaiPiutang,

      penerimaan,

      keterangan: parsed.keterangan ?? existing.keterangan,

      status,
    });

    // =================================================
    // UPDATE
    //
    // id_proyek, id_tagihan, id_jurnal,
    // is_posted TIDAK disentuh.
    //
    // saldo juga TIDAK diupdate karena GENERATED.
    // =================================================

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
      .eq("id_piutang_proyek", idPiutang)
      .select(
        `
          id_piutang_proyek,
          id_proyek,
          id_tagihan,
          tanggal,
          customer,
          tanggal_pembayaran,
          nilai_piutang,
          penerimaan,
          saldo,
          keterangan,
          status,
          is_posted,
          created_at,
          updated_at,
          id_jurnal
        `,
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal memperbarui piutang proyek.");
    }

    return NextResponse.json({
      message: "Piutang proyek berhasil diupdate.",
      data,
    });
  } catch (error: unknown) {
    console.error("PUT PIUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengupdate piutang proyek.",
      },
      {
        status: 400,
      },
    );
  }
}

// =====================================================
// DELETE PIUTANG
// =====================================================

export async function DELETE(
  _req: NextRequest,
  context: Context,
): Promise<Response> {
  try {
    const { id } = await context.params;

    const idPiutang = Number(id);

    if (!Number.isInteger(idPiutang) || idPiutang <= 0) {
      return NextResponse.json(
        {
          error: "ID piutang proyek tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // AMBIL DATA
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("piutang_proyek")
      .select(
        `
          id_piutang_proyek,
          id_tagihan,
          is_posted,
          id_jurnal
        `,
      )
      .eq("id_piutang_proyek", idPiutang)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Piutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // JANGAN HAPUS PIUTANG POSTED
    // =================================================

    if (existing.is_posted) {
      return NextResponse.json(
        {
          error: "Piutang yang sudah Posted tidak boleh dihapus.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // HAPUS
    //
    // FK id_tagihan menggunakan ON DELETE RESTRICT.
    // =================================================

    const { error } = await db
      .from("piutang_proyek")
      .delete()
      .eq("id_piutang_proyek", idPiutang);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      message: "Piutang proyek berhasil dihapus.",
    });
  } catch (error: unknown) {
    console.error("DELETE PIUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus piutang proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
