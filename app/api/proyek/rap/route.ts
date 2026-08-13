import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

type RapBody = {
  id_proyek: string;
  id_rab: string;
  id_kategori: number;
  uraian: string;
  qty: number;
  satuan?: string;
  harga: number;
  tanggal: string;
  keterangan?: string;
};

/* =========================
   GET ALL
========================= */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const id_proyek = String(searchParams.get("id_proyek") ?? "");

    if (!id_proyek) {
      return NextResponse.json({ error: "id_proyek wajib" }, { status: 400 });
    }

    const { data, error } = await db
      .from("rap_proyek")
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
      .eq("id_proyek", id_proyek)
      .order("id_kategori", { ascending: true })
      .order("uraian", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal ambil RAP" }, { status: 500 });
  }
}
/* =========================
   POST (ANTI MINUS + VALID)
========================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as RapBody;

    if (!body.id_proyek || !body.id_kategori || !body.uraian || !body.tanggal) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 },
      );
    }

    const qty = Number(body.qty);
    const harga = Number(body.harga);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "Qty harus lebih dari 0" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(harga) || harga <= 0) {
      return NextResponse.json(
        { error: "Harga harus lebih dari 0" },
        { status: 400 },
      );
    }

    const total = qty * harga;

    if (total <= 0) {
      return NextResponse.json(
        { error: "Total tidak boleh 0" },
        { status: 400 },
      );
    }

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select("id")
      .eq("id", body.id_kategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori biaya tidak ditemukan.");
    }

    const { data: rab, error: rabError } = await db
      .from("proyek_rab")
      .select("*")
      .eq("id", body.id_rab)
      .single();

    if (rabError || !rab) {
      throw new Error("RAB tidak ditemukan.");
    }

    if (!rab) {
      throw new Error("Item RAP harus berasal dari RAB.");
    }

    if (rab.satuan !== body.satuan) {
      throw new Error("Satuan RAP harus sama dengan RAB.");
    }

    if (qty > rab.volume) {
      throw new Error("Qty RAP melebihi Volume RAB.");
    }

    if (harga > rab.harga_satuan) {
      throw new Error("Harga RAP melebihi Harga RAB.");
    }

    /* =========================
       INSERT RAP
    ========================= */
    const { data: rap, error: rapError } = await db
      .from("rap_proyek")
      .insert({
        id_rab: body.id_rab,
        id_proyek: body.id_proyek,
        id_kategori: body.id_kategori,
        uraian: body.uraian,
        qty,
        satuan: body.satuan ?? null,
        harga,
        tanggal: body.tanggal,
        keterangan: body.keterangan ?? null,
      })
      .select()
      .single();

    if (rapError || !rap) {
      return NextResponse.json(
        { error: rapError?.message ?? "Gagal simpan RAP" },
        { status: 500 },
      );
    }

    await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "rap_proyek",
      aksi: "INSERT",
      id_referensi: rap.id,
      data: {
        id_rab: rap.id_rab,
        id_rap: rap.id,
        id_proyek: rap.id_proyek,
        id_kategori: rap.id_kategori,
        uraian: rap.uraian,
        qty: rap.qty,
        satuan: rap.satuan,
        harga: rap.harga,
        total,
        tanggal: rap.tanggal,
      },
    });

    return NextResponse.json(
      {
        message: "RAP berhasil disimpan",
        data: rap,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Terjadi kesalahan",
      },
      { status: 400 },
    );
  }
}
