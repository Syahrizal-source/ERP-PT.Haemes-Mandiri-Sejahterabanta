import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  proyekProgressSchema,
  type ProyekProgressRequest,
} from "@/lib/validators/proyekprogress";

import { postProgress } from "@/lib/accounting/postProyekProgress";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    let query = db
      .from("proyek_progress")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil progress proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // =====================================================
    // VALIDASI INPUT
    // =====================================================

    const body: ProyekProgressRequest = proyekProgressSchema.parse(
      await req.json(),
    );

    // =====================================================
    // VALIDASI PROYEK
    // =====================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (!["OPEN", "BERJALAN"].includes(proyek.status)) {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima progress.`,
      );
    }

    // =====================================================
    // INSERT PROGRESS
    // =====================================================

    const { data: inserted, error: insertError } = await db
      .from("proyek_progress")
      .insert({
        id_proyek: body.id_proyek,
        tanggal: body.tanggal,
        no_bukti: body.no_bukti,
        target_volume: body.target_volume,
        realisasi_volume: body.realisasi_volume,
        satuan: body.satuan,
        nilai_progress: body.nilai_progress,
        metode_pembayaran: body.metode_pembayaran,
        status: body.status,
        periode: body.periode ?? null,
        lokasi: body.lokasi ?? null,
        pic: body.pic ?? null,
        keterangan: body.keterangan ?? null,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Progress gagal disimpan.");
    }

    // =====================================================
    // POSTING JURNAL
    // =====================================================

    const idJurnal = await postProgress({
      id_progress: inserted.id,
      id_proyek: inserted.id_proyek,
      tanggal: inserted.tanggal,
      no_bukti: inserted.no_bukti,
      target_volume: Number(inserted.target_volume),
      realisasi_volume: Number(inserted.realisasi_volume),
      satuan: inserted.satuan,
      nilai_progress: Number(inserted.nilai_progress),
      metode_pembayaran: inserted.metode_pembayaran,
      status: inserted.status,
      periode: inserted.periode,
      lokasi: inserted.lokasi,
      pic: inserted.pic,
      keterangan: inserted.keterangan,
    });

    // =====================================================
    // AUDIT LOG
    // =====================================================

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_progress",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: {
        ...inserted,
        id_jurnal: idJurnal,
      },
    });

    // =====================================================
    // AMBIL HASIL TERAKHIR
    // =====================================================

    const { data: result, error: resultError } = await db
      .from("proyek_progress")
      .select("*")
      .eq("id", inserted.id)
      .single();

    if (resultError || !result) {
      throw new Error(
        resultError?.message ??
          "Progress berhasil tetapi gagal mengambil hasil.",
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Progress proyek berhasil disimpan dan diposting.",
        id_jurnal: idJurnal,
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan progress proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
