import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import { ProyekOperasional } from "@/types/proyek";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const body: Partial<Omit<ProyekOperasional, "id">> = await req.json();

    const payload: Partial<Omit<ProyekOperasional, "id">> = {
      ...body,
    };

    if (body.qty !== undefined && body.harga !== undefined) {
      payload.total = Number(body.qty) * Number(body.harga);
    }

    if (body.qty !== undefined) {
      validatePositive(body.qty, "Qty");
    }

    if (body.harga !== undefined) {
      validatePositive(body.harga, "Harga");
    }

    if (body.uraian !== undefined && body.uraian.trim() === "") {
      throw new Error("Uraian wajib diisi.");
    }

    if (body.id_proyek) {
      const { data: proyek } = await db
        .from("proyek_master")
        .select("id")
        .eq("id", body.id_proyek)
        .single();

      if (!proyek) {
        throw new Error("Proyek tidak ditemukan.");
      }
    }

    if (body.id_kategori !== undefined) {
      const { data: kategori } = await db
        .from("kategori_biaya_proyek")
        .select("id")
        .eq("id", body.id_kategori)
        .single();

      if (!kategori) {
        throw new Error("Kategori operasional tidak ditemukan.");
      }
    }

    const { data, error } = await db
      .from("proyek_operasional")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_operasional",
      aksi: "UPDATE",
      id_referensi: id,
      data,
    });

    return NextResponse.json({
      success: true,
      data,
    });
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

export async function DELETE(_: NextRequest, context: Context) {
  const { id } = await context.params;

  const { data: operasional } = await db
    .from("proyek_operasional")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await db.from("proyek_operasional").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 400,
      },
    );
  }

  await db.from("audit_log").insert({
    modul: "PROYEK",
    tabel: "proyek_operasional",
    aksi: "DELETE",
    id_referensi: id,
    data: operasional,
  });

  return NextResponse.json({
    success: true,
    message: "Operasional proyek berhasil dihapus.",
  });
}
