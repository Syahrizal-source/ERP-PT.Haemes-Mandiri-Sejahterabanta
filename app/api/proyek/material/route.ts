import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { postMaterial } from "@/lib/accounting/postMaterial";
import { validatePositive } from "@/lib/validator";

import type { ProyekMaterial } from "@/types/proyek";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

function isValidUuid(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// =====================================================
// GET /api/proyek/material
// =====================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idProyek = searchParams.get("id_proyek");

    if (idProyek && !isValidUuid(idProyek)) {
      return NextResponse.json(
        {
          success: false,
          error: "ID proyek tidak valid.",
        },
        { status: 400 },
      );
    }

    let query = db
      .from("proyek_material")
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
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET PROYEK MATERIAL ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data material proyek.",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: data ?? [],
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("GET PROYEK MATERIAL EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

// =====================================================
// POST /api/proyek/material
// =====================================================

export async function POST(req: NextRequest) {
  try {
    // ===================================================
    // PARSE JSON
    // ===================================================

    let body: Omit<ProyekMaterial, "id">;

    try {
      body = (await req.json()) as Omit<ProyekMaterial, "id">;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Request body harus berupa JSON yang valid.",
        },
        { status: 400 },
      );
    }

    // ===================================================
    // VALIDASI DASAR
    // ===================================================

    if (!body.id_proyek || !isValidUuid(body.id_proyek)) {
      return NextResponse.json(
        {
          success: false,
          error: "ID proyek tidak valid.",
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(Number(body.id_kategori))) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori material tidak valid.",
        },
        { status: 400 },
      );
    }

    try {
      validatePositive(body.qty, "Qty");
      validatePositive(body.harga, "Harga");
    } catch (error: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: getErrorMessage(error),
        },
        { status: 400 },
      );
    }

    const qty = Number(body.qty);
    const harga = Number(body.harga);
    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Total material tidak valid.",
        },
        { status: 400 },
      );
    }

    if (!body.tanggal) {
      return NextResponse.json(
        {
          success: false,
          error: "Tanggal wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!body.satuan?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Satuan wajib diisi.",
        },
        { status: 400 },
      );
    }

    // ===================================================
    // VALIDASI METODE PEMBAYARAN
    // ===================================================

    const metodePembayaran = body.metode_pembayaran;

    const allowedMetode = [
      "KAS",
      "KAS_BESAR",
      "KAS_KECIL",
      "BANK",
      "HUTANG",
    ] as const;

    if (!allowedMetode.includes(metodePembayaran)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Metode pembayaran harus KAS, KAS_BESAR, KAS_KECIL, BANK, atau HUTANG.",
        },
        { status: 400 },
      );
    }

    // ===================================================
    // VALIDASI PROYEK
    // ===================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")
      .eq("id", body.id_proyek)
      .maybeSingle();

    if (proyekError) {
      console.error("VALIDASI PROYEK ERROR:", proyekError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal memeriksa proyek.",
          detail: proyekError.message,
        },
        { status: 500 },
      );
    }

    if (!proyek) {
      return NextResponse.json(
        {
          success: false,
          error: "Proyek tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    // ===================================================
    // STATUS PROYEK
    // ===================================================

    const allowedStatus = ["OPEN", "BERJALAN"] as const;

    if (!allowedStatus.includes(proyek.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Proyek tidak dapat menerima transaksi material. Status: ${proyek.status}`,
        },
        { status: 400 },
      );
    }

    // ===================================================
    // VALIDASI KATEGORI
    // ===================================================

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select("id, kode, nama, jenis, aktif")
      .eq("id", body.id_kategori)
      .maybeSingle();

    if (kategoriError) {
      console.error("VALIDASI KATEGORI ERROR:", kategoriError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal memeriksa kategori material.",
          detail: kategoriError.message,
        },
        { status: 500 },
      );
    }

    if (!kategori) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori material tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    if (!kategori.aktif) {
      return NextResponse.json(
        {
          success: false,
          error: "Kategori material sudah tidak aktif.",
        },
        { status: 400 },
      );
    }

    // ===================================================
    // NOMOR BUKTI
    // ===================================================

    const noBukti = `MAT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    // ===================================================
    // INSERT MATERIAL
    // ===================================================

    const payload = {
      id_proyek: body.id_proyek,
      id_kategori: body.id_kategori,
      tanggal: body.tanggal,
      qty,
      satuan: body.satuan.trim(),
      harga,
      total,
      gudang: body.gudang?.trim() || null,
      supplier: body.supplier?.trim() || null,
      keterangan: body.keterangan?.trim() || null,
      metode_pembayaran: metodePembayaran,
      no_bukti: noBukti,
    };

    const { data, error } = await db
      .from("proyek_material")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.error("INSERT PROYEK MATERIAL ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error: error?.message ?? "Gagal menyimpan material proyek.",
        },
        { status: 500 },
      );
    }

    // ===================================================
    // POSTING JURNAL
    // ===================================================

    let idJurnal: number;

    try {
      idJurnal = await postMaterial({
        id_material: data.id,
        id_proyek: data.id_proyek,
        id_kategori: data.id_kategori,
        tanggal: data.tanggal,
        no_bukti: data.no_bukti,
        qty: Number(data.qty),
        satuan: data.satuan ?? "",
        harga: Number(data.harga),
        metode_pembayaran: data.metode_pembayaran,
        gudang: data.gudang,
        supplier: data.supplier,
        keterangan: data.keterangan,
      });
    } catch (error: unknown) {
      console.error("POSTING MATERIAL ERROR:", error);

      // Material sudah masuk tetapi jurnal gagal.
      // Jangan menyembunyikan kondisi ini.
      return NextResponse.json(
        {
          success: false,
          error: "Material tersimpan tetapi jurnal gagal dibuat.",
          detail: getErrorMessage(error),
          id_material: data.id,
        },
        { status: 500 },
      );
    }

    // ===================================================
    // AUDIT LOG
    // ===================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_material",
      aksi: "INSERT",
      id_referensi: data.id,
      data: {
        id: data.id,
        id_proyek: data.id_proyek,
        kode_proyek: proyek.kode_proyek,
        kode_accounting_proyek: proyek.kode_accounting_proyek,
        id_kategori: data.id_kategori,
        kategori: kategori.nama,
        kode_kategori: kategori.kode,
        qty: Number(data.qty),
        satuan: data.satuan,
        harga: Number(data.harga),
        total: Number(data.total),
        metode_pembayaran: data.metode_pembayaran,
        no_bukti: data.no_bukti,
        id_jurnal: idJurnal,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG ERROR:", auditError);

      return NextResponse.json(
        {
          success: false,
          error: "Material dan jurnal berhasil dibuat, tetapi audit log gagal.",
          detail: auditError.message,
          id_material: data.id,
          id_jurnal: idJurnal,
        },
        { status: 500 },
      );
    }

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json(
      {
        success: true,
        message: "Material proyek berhasil ditambahkan.",
        data: {
          ...data,
          id_jurnal: idJurnal,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("POST PROYEK MATERIAL ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
