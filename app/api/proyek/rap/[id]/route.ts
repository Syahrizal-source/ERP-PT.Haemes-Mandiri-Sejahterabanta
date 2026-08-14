import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

/* =========================
   GET DETAIL RAP
========================= */
export async function GET(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { data, error } = await db
      .from("rap_proyek")
      .select(
        `
    *,
    rab:proyek_rab!fk_rap_rab(
        id,
        uraian,
        volume,
        satuan,
        harga_satuan
    ),
    kategori:kategori_biaya_proyek(
        id,
        kode,
        nama,
        jenis
    )
`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET RAP ERROR:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/* =========================
   UPDATE RAP
========================= */
export async function PUT(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { data: rap } = await db
      .from("rap_proyek")
      .select("id_rab")
      .eq("id", id)
      .single();

    if (!rap) {
      return NextResponse.json(
        { error: "RAP tidak ditemukan." },
        { status: 404 },
      );
    }

    const { data: rab } = await db
      .from("proyek_rab")
      .select("*")
      .eq("id", rap.id_rab)
      .single();

    if (!rab) {
      return NextResponse.json(
        { error: "RAB tidak ditemukan." },
        { status: 404 },
      );
    }

    if (Number(body.qty) > rab.volume) {
      throw new Error("Qty RAP melebihi volume RAB.");
    }

    if (!body.tanggal) {
      return NextResponse.json(
        { error: "Tanggal wajib diisi." },
        { status: 400 },
      );
    }

    if (Number(body.qty) <= 0) {
      return NextResponse.json(
        { error: "Qty harus lebih dari 0." },
        { status: 400 },
      );
    }

    const { error } = await db
      .from("rap_proyek")
      .update({
        qty: Number(body.qty),
        tanggal: body.tanggal,
        keterangan: body.keterangan ?? null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "rap_proyek",
      aksi: "UPDATE",
      id_referensi: id,
      data: {
        id_rab: rap.id_rab,
        qty: Number(body.qty),
        tanggal: body.tanggal,
        keterangan: body.keterangan ?? null,
      },
    });

    return NextResponse.json({
      message: "RAP berhasil diupdate",
    });
  } catch (err) {
    console.error("PUT RAP ERROR:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

/* =========================
   DELETE RAP
========================= */
export async function DELETE(
  req: NextRequest,
  context: { params: Params },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const { error: deleteError } = await db
      .from("rap_proyek")
      .delete()
      .eq("id", id);

    const { data: rap, error: rapError } = await db
      .from("rap_proyek")
      .select("*")
      .eq("id", id);

    if (rapError || !rap) {
      return NextResponse.json(
        { error: "Data RAP tidak ditemukan." },
        { status: 404 },
      );
    }

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "rap_proyek",
      aksi: "DELETE",
      id_referensi: id,
      data: rap,
    });

    const { count } = await db
      .from("realisasi_proyek")
      .select("*", { count: "exact", head: true })
      .eq("id_rap", id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "RAP sudah dipakai Realisasi.",
        },
        { status: 400 },
      );
    }

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "RAP berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE RAP ERROR:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
