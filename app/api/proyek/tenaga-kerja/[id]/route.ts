import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_tenaga_kerja")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil data tenaga kerja." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.upah !== undefined) {
      validatePositive(body.upah, "Upah");
    }

    if (
      body.tanggal_mulai &&
      body.tanggal_selesai &&
      body.tanggal_selesai < body.tanggal_mulai
    ) {
      throw new Error(
        "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.",
      );
    }

    const allowedStatus = ["AKTIF", "SELESAI", "DIBATALKAN"] as const;

    if (body.status && !allowedStatus.includes(body.status)) {
      throw new Error("Status tidak valid.");
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

    if (body.tipe && !allowedTipe.includes(body.tipe)) {
      throw new Error("Tipe tenaga kerja tidak valid.");
    }

    const payload = {
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

    const { data, error } = await db
      .from("proyek_tenaga_kerja")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_tenaga_kerja",
      aksi: "UPDATE",
      id_referensi: data.id,
      data,
    });

    return NextResponse.json({ message: "Tenaga kerja diupdate" });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  const { id } = await context.params;

  const { data } = await db
    .from("proyek_tenaga_kerja")
    .select("*")
    .eq("id", id)
    .single();

  await db.from("audit_log").insert({
    modul: "PROYEK",
    tabel: "proyek_tenaga_kerja",
    aksi: "DELETE",
    id_referensi: id,
    data,
  });

  const { error } = await db.from("proyek_tenaga_kerja").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Tenaga kerja dihapus" });
}
