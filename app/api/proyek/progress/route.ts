import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import {
  proyekProgressSchema,
  ProyekProgressRequest,
} from "@/lib/validators/proyekprogress";
import { postProgress } from "@/lib/accounting/postProyekProgress";

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: ProyekProgressRequest = proyekProgressSchema.parse(
      await req.json(),
    );

    validatePositive(body.target_volume, "Target Volume");
    validatePositive(body.realisasi_volume, "Realisasi Volume");
    validatePositive(body.nilai_progress, "Nilai Progress");

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id,status")
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

    const payload = {
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
    };

    const { data: inserted, error } = await db
      .from("proyek_progress")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await postProgress({
      id_progress: inserted.id,
      id_proyek: inserted.id_proyek,
      tanggal: inserted.tanggal,
      no_bukti:
        inserted.no_bukti ?? `PRG-${String(inserted.id).substring(0, 8)}`,
      target_volume: Number(inserted.target_volume),
      realisasi_volume: Number(inserted.realisasi_volume),
      satuan: inserted.satuan,
      nilai_progress: Number(inserted.nilai_progress),
      metode_pembayaran: inserted.metode_pembayaran as
        | "KAS"
        | "BANK"
        | "HUTANG",
      status: inserted.status as
        | "ON_PROGRESS"
        | "SELESAI"
        | "TERLAMBAT"
        | "DIBATALKAN",
      periode: inserted.periode,
      lokasi: inserted.lokasi,
      pic: inserted.pic,
      keterangan: inserted.keterangan,
      created_by: null,
    });

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_progress",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: inserted,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Progress proyek berhasil ditambahkan.",
        data: inserted,
      },
      {
        status: 201,
      },
    );
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error: (e as Error).message,
      },
      {
        status: 400,
      },
    );
  }
}
