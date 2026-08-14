import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";

/* =====================
   TYPE CONTEXT (WAJIB)
===================== */
type Context = {
  params: Promise<{
    id: string;
  }>;
};

/* =====================
   GET DETAIL RAB
===================== */
export async function GET(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_rab")
      .select(
        `
    *,
    kategori:kategori_biaya_proyek(
      id,
      kode,
      nama,
      jenis
    )
  `,
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Gagal mengambil detail RAB" },
      { status: 500 },
    );
  }
}

/* =====================
   UPDATE RAB
===================== */
export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (body.volume !== undefined) {
      validatePositive(body.volume, "Volume");
    }

    if (body.harga_satuan !== undefined) {
      validatePositive(body.harga_satuan, "Harga Satuan");
    }

    if (body.id_proyek === "") {
      throw new Error("Proyek wajib dipilih.");
    }

    if (body.id_kategori === undefined || body.id_kategori === null) {
      throw new Error("Kategori biaya wajib dipilih.");
    }

    if (!body.uraian?.trim()) {
      throw new Error("Uraian wajib diisi.");
    }

    if (!body.satuan?.trim()) {
      throw new Error("Satuan wajib diisi.");
    }

    const updateData = {
      id_proyek: body.id_proyek,
      id_kategori: body.id_kategori,
      uraian: body.uraian,
      volume: body.volume,
      satuan: body.satuan,
      harga_satuan: body.harga_satuan,
      keterangan: body.keterangan ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db
      .from("proyek_rab")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "RAB berhasil diupdate",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Terjadi kesalahan.",
      },
      { status: 400 },
    );
  }
}

/* =====================
   DELETE RAB
===================== */
export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_rab")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "RAB berhasil dihapus",
      data,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Gagal menghapus RAB" }, { status: 500 });
  }
}
