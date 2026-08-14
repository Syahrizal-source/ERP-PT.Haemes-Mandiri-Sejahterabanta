import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import {
  proyekTenagaKerjaSchema,
  ProyekTenagaKerjaRequest,
} from "@/lib/validators/proyekTenagaKerja";
import { postTenagaKerja } from "@/lib/accounting/postTenagaKerja";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idProyek = searchParams.get("id_proyek");

  if (!idProyek) {
    return NextResponse.json(
      { error: "id_proyek wajib diisi" },
      { status: 400 },
    );
  }

  const { data, error } = await db
    .from("proyek_tenaga_kerja")
    .select("*")
    .eq("id_proyek", idProyek)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body: ProyekTenagaKerjaRequest = proyekTenagaKerjaSchema.parse(
      await req.json(),
    );

    validatePositive(body.upah, "Upah");

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    if (!body.tanggal_mulai) {
      throw new Error("Tanggal mulai wajib diisi.");
    }

    if (body.tanggal_selesai && body.tanggal_selesai < body.tanggal_mulai) {
      throw new Error(
        "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.",
      );
    }

    const allowedProjectStatus = ["OPEN", "BERJALAN"] as const;

    if (!allowedProjectStatus.includes(proyek.status)) {
      throw new Error(
        `Proyek tidak dapat menerima transaksi tenaga kerja. Status : ${proyek.status}`,
      );
    }

    const allowedTipe = [
      "MANAJEMEN_PROYEK",
      "TENAGA_AHLI",
      "TEKNISI_ANALIS",
      "OPERATOR_ALAT_BERAT",
      "OPERATOR_ANGKUTAN",
      "PEKERJA_LAPANGAN",
      "ADMINISTRASI",
    ] as const;

    if (!allowedTipe.includes(body.tipe)) {
      throw new Error("Tipe tenaga kerja tidak valid.");
    }

    const allowedStatus = ["AKTIF", "SELESAI", "DIBATALKAN"];

    if (!allowedStatus.includes(body.status)) {
      throw new Error("Status tenaga kerja tidak valid.");
    }

    const payload = {
      id_proyek: body.id_proyek,
      nama: body.nama,
      jabatan: body.jabatan ?? null,
      tipe: body.tipe,
      upah: body.upah,
      periode: body.periode ?? null,
      tanggal_mulai: body.tanggal_mulai,
      tanggal_selesai: body.tanggal_selesai,
      status: body.status,
      keterangan: body.keterangan ?? null,
    };

    const { data: inserted, error } = await db
      .from("proyek_tenaga_kerja")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await postTenagaKerja({
      id_tenaga_kerja: inserted.id,
      id_proyek: inserted.id_proyek,
      nama: inserted.nama,
      jabatan: inserted.jabatan,
      tipe: inserted.tipe,
      upah: Number(inserted.upah),
      periode: inserted.periode,
      tanggal_mulai: inserted.tanggal_mulai,
      tanggal_selesai: inserted.tanggal_selesai,
      status: inserted.status,
      no_bukti: `TK-${String(inserted.id).substring(0, 8)}`,
      metode_pembayaran: "BANK",
      keterangan: inserted.keterangan,
    });

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_tenaga_kerja",
      aksi: "INSERT",
      id_referensi: inserted.id,
      data: {
        id: inserted.id,
        nama: inserted.nama,
        jabatan: inserted.jabatan,
        tipe: inserted.tipe,
        upah: inserted.upah,
        periode: inserted.periode,
        tanggal_mulai: inserted.tanggal_mulai,
        tanggal_selesai: inserted.tanggal_selesai,
        status: inserted.status,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tenaga kerja berhasil ditambahkan.",
        data: inserted,
      },
      {
        status: 201,
      },
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
