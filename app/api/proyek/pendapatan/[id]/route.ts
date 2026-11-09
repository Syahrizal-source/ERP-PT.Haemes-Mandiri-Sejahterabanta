import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pendapatanProyekSchema,
  normalizePendapatanProyek,
  hitungPendapatanProyek,
  validatePendapatanProyek,
} from "@/lib/validators/pendapatanProyek";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * ============================================================
 * GET /api/proyek/pendapatan/[id]
 * ============================================================
 */

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const idPendapatan = Number(id);

    if (!Number.isInteger(idPendapatan) || idPendapatan <= 0) {
      return NextResponse.json(
        {
          error: "ID pendapatan tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("pendapatan_proyek")
      .select(
        `
          id,
          id_proyek,
          tanggal,
          no_bukti,
          keterangan,
          nilai_pendapatan,
          jenis_pajak,
          tarif_pajak,
          nilai_pajak,
          nilai_bersih,
          id_jurnal,
          jenis_transaksi,
          created_at,
          updated_at,
          proyek_master (
            id,
            kode_proyek,
            nama_proyek,
            customer,
            jenis_proyek,
            nilai_kontrak,
            status
          )
        `,
      )
      .eq("id", idPendapatan)
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Data pendapatan proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(data, {
      status: 200,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pendapatan proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

/**
 * ============================================================
 * PUT /api/proyek/pendapatan/[id]
 * ============================================================
 *
 * Transaksi yang sudah diposting tidak boleh diedit langsung.
 *
 * Alasannya:
 *
 * pendapatan_proyek
 *       ↓
 * jurnal
 *       ↓
 * jurnal_detail
 *
 * Jika nilai diubah tetapi jurnal lama tetap ada,
 * laporan accounting menjadi tidak sinkron.
 * ============================================================
 */

export async function PUT(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const idPendapatan = Number(id);

    if (!Number.isInteger(idPendapatan) || idPendapatan <= 0) {
      return NextResponse.json(
        {
          error: "ID pendapatan tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * AMBIL DATA LAMA
     * ----------------------------------------------------------
     */

    const { data: existing, error: existingError } = await db
      .from("pendapatan_proyek")
      .select(
        `
          id,
          id_proyek,
          id_jurnal,
          no_bukti
        `,
      )
      .eq("id", idPendapatan)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Data pendapatan proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * JIKA SUDAH POSTING
     * ----------------------------------------------------------
     */

    if (existing.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pendapatan proyek sudah diposting ke jurnal dan tidak dapat diubah langsung.",
        },
        {
          status: 409,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * PARSE REQUEST
     * ----------------------------------------------------------
     */

    const body: unknown = await request.json();

    const parsed = pendapatanProyekSchema.parse(body);

    const normalized = normalizePendapatanProyek(parsed);

    validatePendapatanProyek(normalized);

    const computed = hitungPendapatanProyek(normalized);

    /**
     * ----------------------------------------------------------
     * CEK PROYEK
     * ----------------------------------------------------------
     */

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, nama_proyek")
      .eq("id", normalized.id_proyek)
      .single();

    if (proyekError || !proyek) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * CEK NO BUKTI
     * ----------------------------------------------------------
     */

    const { data: duplicate, error: duplicateError } = await db
      .from("pendapatan_proyek")
      .select("id")
      .eq("no_bukti", normalized.no_bukti)
      .neq("id", idPendapatan)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json(
        {
          error: `Gagal memeriksa nomor bukti: ${duplicateError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (duplicate) {
      return NextResponse.json(
        {
          error: "Nomor bukti pendapatan sudah digunakan.",
        },
        {
          status: 409,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * UPDATE
     * ----------------------------------------------------------
     */

    const { data, error } = await db
      .from("pendapatan_proyek")
      .update({
        id_proyek: normalized.id_proyek,

        tanggal: normalized.tanggal,

        no_bukti: normalized.no_bukti,

        keterangan: normalized.keterangan,

        nilai_pendapatan: normalized.nilai_pendapatan,

        jenis_pajak: normalized.jenis_pajak,

        tarif_pajak: computed.tarif_pajak,

        nilai_pajak: computed.nilai_pajak,

        nilai_bersih: computed.nilai_bersih,

        jenis_transaksi: normalized.jenis_transaksi,
      })
      .eq("id", idPendapatan)
      .select(
        "id, id_proyek, tanggal, no_bukti, keterangan, nilai_pendapatan, jenis_pajak, tarif_pajak, nilai_pajak, nilai_bersih, jenis_transaksi, id_jurnal",
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: `Gagal memperbarui pendapatan proyek: ${error.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Pendapatan proyek berhasil diperbarui.",
        data: {
          ...data,
          proyek,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Data pendapatan proyek tidak valid.",
      },
      {
        status: 400,
      },
    );
  }
}

/**
 * ============================================================
 * DELETE /api/proyek/pendapatan/[id]
 * ============================================================
 */

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const idPendapatan = Number(id);

    if (!Number.isInteger(idPendapatan) || idPendapatan <= 0) {
      return NextResponse.json(
        {
          error: "ID pendapatan tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * AMBIL DATA
     * ----------------------------------------------------------
     */

    const { data: existing, error: existingError } = await db
      .from("pendapatan_proyek")
      .select("id, id_jurnal, no_bukti")
      .eq("id", idPendapatan)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Data pendapatan proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * JANGAN HAPUS TRANSAKSI YANG SUDAH POSTING
     * ----------------------------------------------------------
     */

    if (existing.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Pendapatan proyek sudah diposting ke jurnal dan tidak dapat dihapus langsung.",
        },
        {
          status: 409,
        },
      );
    }

    /**
     * ----------------------------------------------------------
     * DELETE
     * ----------------------------------------------------------
     */

    const { error: deleteError } = await db
      .from("pendapatan_proyek")
      .delete()
      .eq("id", idPendapatan);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `Gagal menghapus pendapatan proyek: ${deleteError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Pendapatan proyek berhasil dihapus.",
        no_bukti: existing.no_bukti,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus pendapatan proyek.",
      },
      {
        status: 500,
      },
    );
  }
}
