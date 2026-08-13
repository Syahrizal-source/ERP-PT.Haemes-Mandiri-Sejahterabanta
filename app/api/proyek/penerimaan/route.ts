import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  ProyekPenerimaanSchema,
  type ProyekPenerimaanInput,
} from "@/lib/validators/penerimaanproyek";

import {
  postProyekPenerimaan,
  type MetodePenerimaanProyek,
} from "@/lib/accounting/postPenerimaanProyek";

// =====================================================
// GET LIST PENERIMAAN PROYEK
// =====================================================

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    if (!idProyek || !idProyek.trim()) {
      return NextResponse.json(
        {
          error: "id_proyek wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("proyek_penerimaan")
      .select(
        `
          id,
          id_tagihan,
          tanggal,
          jumlah,
          metode,
          bank,
          proyek_tagihan!inner(
            id_proyek
          )
        `,
      )
      .eq("proyek_tagihan.id_proyek", idProyek)
      .order("tanggal", {
        ascending: true,
      });

    if (error) {
      throw new Error(`Gagal mengambil penerimaan proyek: ${error.message}`);
    }

    const result = (data ?? []).map((item) => ({
      id: String(item.id),
      id_tagihan: String(item.id_tagihan),
      tanggal: String(item.tanggal),
      jumlah: Number(item.jumlah),
      metode: item.metode as MetodePenerimaanProyek,
      bank: item.bank ?? null,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET PENERIMAAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil penerimaan proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

// =====================================================
// POST PENERIMAAN PROYEK
// =====================================================

export async function POST(req: NextRequest): Promise<Response> {
  try {
    // =================================================
    // VALIDASI REQUEST
    // =================================================

    const body: unknown = await req.json();

    const parsed: ProyekPenerimaanInput = ProyekPenerimaanSchema.parse(body);

    // =================================================
    // POST PENERIMAAN
    //
    // Fungsi ini:
    // - validasi tagihan
    // - validasi piutang
    // - anti-minus
    // - ambil COA
    // - buat jurnal penerimaan
    // - insert proyek_penerimaan
    // - update piutang_proyek
    // - update status
    // =================================================

    const result = await postProyekPenerimaan({
      id_tagihan: parsed.id_tagihan,
      tanggal: parsed.tanggal,
      jumlah: Number(parsed.jumlah),
      metode: parsed.metode,
      bank: parsed.bank ?? null,
    });

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      {
        message: "Penerimaan proyek berhasil disimpan.",
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PENERIMAAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan penerimaan proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
