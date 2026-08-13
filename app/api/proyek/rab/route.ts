import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { ProyekRAB } from "@/types/proyek";
import { validatePositive } from "@/lib/validator";

/**
 * GET RAB
 * - Semua RAB
 * - Filter berdasarkan id_proyek
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    let query = db
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
      .order("id_kategori", { ascending: true })
      .order("uraian", { ascending: true });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Terjadi kesalahan",
      },
      { status: 500 },
    );
  }
}

/**
 * POST RAB
 */
export async function POST(req: NextRequest) {
  try {
    const body: Omit<ProyekRAB, "id" | "total" | "created_at" | "updated_at"> =
      await req.json();

    if (!body.id_proyek) {
      throw new Error("Proyek wajib dipilih.");
    }

    if (!body.id_kategori) {
      throw new Error("Kategori biaya wajib dipilih.");
    }

    if (!body.uraian?.trim()) {
      throw new Error("Uraian wajib diisi.");
    }

    if (!body.satuan?.trim()) {
      throw new Error("Satuan wajib diisi.");
    }

    validatePositive(body.volume, "Volume");
    validatePositive(body.harga_satuan, "Harga Satuan");

    const { data, error } = await db
      .from("proyek_rab")
      .insert({
        id_proyek: body.id_proyek,
        id_kategori: body.id_kategori,
        uraian: body.uraian,
        volume: body.volume,
        satuan: body.satuan,
        harga_satuan: body.harga_satuan,
        keterangan: body.keterangan ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_rab",
      aksi: "INSERT",
      id_referensi: data.id,
      created_by: null,
      data: {
        id_rab: data.id,
        id_proyek: data.id_proyek,
        id_kategori: data.id_kategori,
        uraian: data.uraian,
        volume: data.volume,
        satuan: data.satuan,
        harga_satuan: data.harga_satuan,
        total: data.total,
      },
    });

    if (auditError) {
      throw auditError;
    }

    return NextResponse.json(
      {
        message: "RAB berhasil ditambahkan.",
        data,
      },
      { status: 201 },
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
