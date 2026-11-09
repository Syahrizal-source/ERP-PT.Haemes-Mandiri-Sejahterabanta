import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type HppRow = {
  id_proyek: string;
  kode_proyek: string;
  nama_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan_jurnal: string | null;
  kode_coa: string;
  nama_coa: string;
  kategori_hpp: string;
  nilai_hpp: number | string | null;
};

type HppDetail = {
  id_proyek: string;
  kode_proyek: string;
  nama_proyek: string;
  tanggal: string;
  no_bukti: string;
  keterangan_jurnal: string;
  kode_coa: string;
  nama_coa: string;
  kategori_hpp: string;
  nilai_hpp: number;
};

type HppSummary = {
  kategori_hpp: string;
  jumlah_transaksi: number;
  total_hpp: number;
};

function toNumber(value: number | string | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function roundNumber(value: number): number {
  return Number(value.toFixed(2));
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;

    const idProyek = searchParams.get("id_proyek")?.trim() ?? "";
    const dari = searchParams.get("dari")?.trim() ?? "";
    const sampai = searchParams.get("sampai")?.trim() ?? "";

    /*
     * =========================================
     * PROYEK WAJIB
     * =========================================
     *
     * HPP tidak boleh dihitung gabungan.
     */

    if (!idProyek) {
      return NextResponse.json(
        {
          error: "Proyek wajib dipilih",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =========================================
     * VALIDASI UUID
     * =========================================
     */

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(idProyek)) {
      return NextResponse.json(
        {
          error: "ID proyek tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =========================================
     * VALIDASI TANGGAL
     * =========================================
     */

    if (dari && !validDate(dari)) {
      return NextResponse.json(
        {
          error: "Tanggal awal tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (sampai && !validDate(sampai)) {
      return NextResponse.json(
        {
          error: "Tanggal akhir tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    if (dari && sampai && dari > sampai) {
      return NextResponse.json(
        {
          error: "Tanggal awal tidak boleh lebih besar dari tanggal akhir",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * =========================================
     * CEK MASTER PROYEK
     * =========================================
     */

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id,kode_proyek,nama_proyek")
      .eq("id", idProyek)
      .maybeSingle();

    if (proyekError) {
      return NextResponse.json(
        {
          error: proyekError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!proyek) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * =========================================
     * QUERY HPP
     * =========================================
     *
     * INI BAGIAN PENTING:
     *
     * Hanya mengambil transaksi dengan
     * id_proyek yang sedang dipilih.
     */

    let query = db
      .from("v_hpp_proyek")
      .select(
        `
          id_proyek,
          kode_proyek,
          nama_proyek,
          tanggal,
          no_bukti,
          keterangan_jurnal,
          kode_coa,
          nama_coa,
          kategori_hpp,
          nilai_hpp
        `,
      )
      .eq("id_proyek", idProyek)
      .order("tanggal", {
        ascending: true,
      });

    if (dari) {
      query = query.gte("tanggal", dari);
    }

    if (sampai) {
      query = query.lte("tanggal", sampai);
    }

    const { data, error } = await query;

    if (error) {
      console.error("HPP PROYEK QUERY ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * =========================================
     * DETAIL
     * =========================================
     */

    const details: HppDetail[] = (data ?? []).map(
      (row: HppRow): HppDetail => ({
        id_proyek: row.id_proyek,
        kode_proyek: row.kode_proyek,
        nama_proyek: row.nama_proyek,
        tanggal: row.tanggal,
        no_bukti: row.no_bukti,
        keterangan_jurnal: row.keterangan_jurnal ?? "-",
        kode_coa: row.kode_coa,
        nama_coa: row.nama_coa,
        kategori_hpp: row.kategori_hpp,
        nilai_hpp: roundNumber(toNumber(row.nilai_hpp)),
      }),
    );

    /*
     * =========================================
     * REKAP KATEGORI
     * =========================================
     */

    const categoryMap = new Map<
      string,
      {
        jumlah_transaksi: number;
        total_hpp: number;
      }
    >();

    for (const detail of details) {
      const existing = categoryMap.get(detail.kategori_hpp);

      if (existing) {
        existing.jumlah_transaksi += 1;
        existing.total_hpp += detail.nilai_hpp;
      } else {
        categoryMap.set(detail.kategori_hpp, {
          jumlah_transaksi: 1,
          total_hpp: detail.nilai_hpp,
        });
      }
    }

    const summary: HppSummary[] = Array.from(categoryMap.entries())
      .map(
        ([kategori_hpp, value]): HppSummary => ({
          kategori_hpp,
          jumlah_transaksi: value.jumlah_transaksi,
          total_hpp: roundNumber(value.total_hpp),
        }),
      )
      .sort((a, b) => b.total_hpp - a.total_hpp);

    /*
     * =========================================
     * TOTAL HPP PROYEK
     * =========================================
     */

    const totalHpp = roundNumber(
      details.reduce(
        (total: number, detail: HppDetail): number => total + detail.nilai_hpp,
        0,
      ),
    );

    /*
     * =========================================
     * RESPONSE
     * =========================================
     */

    return NextResponse.json({
      proyek: {
        id: proyek.id,
        kode_proyek: proyek.kode_proyek,
        nama_proyek: proyek.nama_proyek,
      },

      filters: {
        dari: dari || null,
        sampai: sampai || null,
      },

      total_transaksi: details.length,

      total_hpp: totalHpp,

      summary,

      details,
    });
  } catch (error: unknown) {
    console.error("HPP PROYEK API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil laporan HPP proyek",
      },
      {
        status: 500,
      },
    );
  }
}
