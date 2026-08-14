import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  TagihanProyekSchema,
  type TagihanProyekInput,
} from "@/lib/validators/tagihanproyek";

import { postTagihan } from "@/lib/accounting/postTagihanProyek";

/* =========================================================
   GET TAGIHAN PER PROYEK
========================================================= */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    if (!idProyek) {
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
      .from("proyek_tagihan")
      .select("*")
      .eq("id_proyek", idProyek)
      .order("tanggal", {
        ascending: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("GET TAGIHAN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data tagihan.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   POST TAGIHAN PROYEK
========================================================= */

export async function POST(req: NextRequest) {
  let tagihanId: string | null = null;

  try {
    const json: unknown = await req.json();

    /* =====================================================
       VALIDASI
    ===================================================== */

    const payload: TagihanProyekInput = TagihanProyekSchema.parse(json);

    if (!Number.isFinite(payload.nilai) || payload.nilai <= 0) {
      throw new Error("Nilai tagihan harus lebih besar dari 0.");
    }

    if (!Number.isFinite(payload.nilai_ppn) || payload.nilai_ppn < 0) {
      throw new Error("Nilai PPN tidak boleh minus.");
    }

    if (!Number.isFinite(payload.nilai_pph) || payload.nilai_pph < 0) {
      throw new Error("Nilai PPh tidak boleh minus.");
    }

    /* =====================================================
       VALIDASI PROYEK
    ===================================================== */

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id")
      .eq("id", payload.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    /* =====================================================
       CEK DUPLIKAT INVOICE
    ===================================================== */

    const { data: existingInvoice, error: invoiceError } = await db
      .from("proyek_tagihan")
      .select("id")
      .eq("nomor_invoice", payload.nomor_invoice)
      .maybeSingle();

    if (invoiceError) {
      throw new Error(invoiceError.message);
    }

    if (existingInvoice) {
      throw new Error(
        `Nomor invoice ${payload.nomor_invoice} sudah digunakan.`,
      );
    }

    /* =====================================================
       HITUNG GRAND TOTAL

       Nilai + PPN - PPh
    ===================================================== */

    const grandTotal = payload.nilai + payload.nilai_ppn - payload.nilai_pph;

    if (!Number.isFinite(grandTotal) || grandTotal < 0) {
      throw new Error("Grand total tagihan tidak valid.");
    }

    /* =====================================================
       INSERT HEADER TAGIHAN
    ===================================================== */

    const { data: tagihan, error: tagihanError } = await db
      .from("proyek_tagihan")
      .insert({
        id_proyek: payload.id_proyek,
        nomor_invoice: payload.nomor_invoice,
        tanggal: payload.tanggal,
        nilai: payload.nilai,

        status: payload.status,

        no_bukti: payload.no_bukti ?? null,
        periode: payload.periode ?? null,

        nilai_ppn: payload.nilai_ppn,
        nilai_pph: payload.nilai_pph,

        total_material: 0,
        total_alat_berat: 0,
        total_tenaga_kerja: 0,
        total_operasional: 0,
        total_realisasi: 0,
        total_subkon: 0,
        total_progress: 0,

        grand_total: grandTotal,

        created_by: payload.created_by ?? null,
      })
      .select("id")
      .single();

    if (tagihanError || !tagihan) {
      throw new Error(
        tagihanError?.message ?? "Gagal menyimpan tagihan proyek.",
      );
    }

    tagihanId = tagihan.id;

    /* =====================================================
       INSERT DETAIL TAGIHAN

       Untuk sekarang boleh kosong.
    ===================================================== */

    if (payload.details.length > 0) {
      const detailRows = payload.details.map((detail) => ({
        id_tagihan: tagihan.id,
        sumber: detail.sumber,
        id_referensi: detail.id_referensi,

        no_bukti: detail.no_bukti ?? null,

        uraian: detail.uraian ?? null,

        qty: detail.qty ?? null,

        satuan: detail.satuan ?? null,

        harga: detail.harga ?? null,

        total: detail.total ?? null,

        id_jurnal: detail.id_jurnal ?? null,
      }));

      const { error: detailError } = await db
        .from("proyek_tagihan_detail")
        .insert(detailRows);

      if (detailError) {
        throw new Error(
          `Gagal menyimpan detail tagihan: ${detailError.message}`,
        );
      }
    }

    /* =====================================================
       POSTING ACCOUNTING

       COA ditentukan oleh postTagihanProyek
       melalui coa_mapping.
    ===================================================== */

    const idJurnal = await postTagihan({
      ...payload,
      id_tagihan: tagihan.id,
    });

    /* =====================================================
       AMBIL HASIL FINAL
    ===================================================== */

    const { data: result, error: resultError } = await db
      .from("proyek_tagihan")
      .select(
        `
        id,
        id_proyek,
        nomor_invoice,
        no_bukti,
        tanggal,
        periode,
        nilai,
        nilai_ppn,
        nilai_pph,
        grand_total,
        status,
        id_jurnal
        `,
      )
      .eq("id", tagihan.id)
      .single();

    if (resultError || !result) {
      throw new Error(
        "Tagihan berhasil diproses tetapi data hasil tidak ditemukan.",
      );
    }

    /* =====================================================
       PASTIKAN POSTED
    ===================================================== */

    if (result.id_jurnal === null) {
      throw new Error(
        "Jurnal berhasil diproses tetapi tagihan belum terhubung ke jurnal.",
      );
    }

    return NextResponse.json(
      {
        message: "Tagihan proyek berhasil dibuat dan diposting.",
        id_tagihan: tagihan.id,
        id_jurnal: idJurnal,
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST TAGIHAN PROYEK ERROR:", error);

    /*
     * Header/detail belum boleh tertinggal sebagai
     * tagihan setengah jadi apabila posting gagal.
     */
    if (tagihanId) {
      await db.from("proyek_tagihan").delete().eq("id", tagihanId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat tagihan proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
