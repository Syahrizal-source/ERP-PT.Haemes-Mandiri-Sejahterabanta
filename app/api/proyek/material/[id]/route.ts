import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { validatePositive } from "@/lib/validator";
import { ProyekMaterial } from "@/types/proyek";

type Context = {
  params: Promise<{ id: string }>;
};

const METODE_PEMBAYARAN = [
  "KAS",
  "KAS_BESAR",
  "KAS_KECIL",
  "BANK",
  "HUTANG",
] as const;

type MetodePembayaran = (typeof METODE_PEMBAYARAN)[number];

function isMetodePembayaran(value: unknown): value is MetodePembayaran {
  return (
    typeof value === "string" &&
    METODE_PEMBAYARAN.includes(value as MetodePembayaran)
  );
}

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID material wajib diisi.",
        },
        { status: 400 },
      );
    }

    const body: Partial<Omit<ProyekMaterial, "id">> = await req.json();

    // =====================================================
    // AMBIL DATA MATERIAL LAMA
    // =====================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_material")
      .select(
        `
        id,
        id_proyek,
        id_kategori,
        tanggal,
        qty,
        satuan,
        harga,
        total,
        metode_pembayaran,
        gudang,
        supplier,
        keterangan,
        id_jurnal,
        no_bukti
        `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Material tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // JANGAN UBAH TRANSAKSI YANG SUDAH POSTING
    // =====================================================

    if (existing.id_jurnal !== null) {
      return NextResponse.json(
        {
          error:
            "Material sudah diposting ke jurnal dan tidak dapat diubah. Gunakan mekanisme koreksi jurnal.",
        },
        { status: 409 },
      );
    }

    // =====================================================
    // PROYEK TETAP
    // =====================================================
    // Jangan menerima perpindahan material ke proyek lain
    // dari endpoint edit.

    if (body.id_proyek !== undefined && body.id_proyek !== existing.id_proyek) {
      return NextResponse.json(
        {
          error: "Proyek material tidak dapat diubah.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // KATEGORI
    // =====================================================

    if (body.id_kategori !== undefined) {
      const { data: kategori, error: kategoriError } = await db
        .from("kategori_biaya_proyek")
        .select("id, kode, nama, jenis, aktif")
        .eq("id", body.id_kategori)
        .single();

      if (kategoriError || !kategori) {
        return NextResponse.json(
          {
            error: "Kategori material tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      if (!kategori.aktif) {
        return NextResponse.json(
          {
            error: "Kategori material sudah tidak aktif.",
          },
          { status: 400 },
        );
      }

      if (kategori.jenis !== "MATERIAL") {
        return NextResponse.json(
          {
            error: "Kategori yang dipilih bukan kategori material.",
          },
          { status: 400 },
        );
      }
    }

    // =====================================================
    // METODE PEMBAYARAN
    // =====================================================

    if (
      body.metode_pembayaran !== undefined &&
      !isMetodePembayaran(body.metode_pembayaran)
    ) {
      return NextResponse.json(
        {
          error: "Metode pembayaran tidak valid.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // QTY
    // =====================================================

    const qty =
      body.qty !== undefined ? Number(body.qty) : Number(existing.qty);

    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        {
          error: "Qty harus lebih besar dari 0.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // HARGA
    // =====================================================

    const harga =
      body.harga !== undefined ? Number(body.harga) : Number(existing.harga);

    if (!Number.isFinite(harga) || harga <= 0) {
      return NextResponse.json(
        {
          error: "Harga harus lebih besar dari 0.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // TOTAL SERVER-SIDE
    // =====================================================

    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        {
          error: "Total material tidak valid.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // SATUAN
    // =====================================================

    if (body.satuan !== undefined && !body.satuan.trim()) {
      return NextResponse.json(
        {
          error: "Satuan wajib diisi.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // TANGGAL
    // =====================================================

    if (body.tanggal !== undefined && !body.tanggal) {
      return NextResponse.json(
        {
          error: "Tanggal wajib diisi.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // PROYEK HARUS MASIH VALID
    // =====================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, status")
      .eq("id", existing.id_proyek)
      .single();

    if (proyekError || !proyek) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const allowedStatus = ["OPEN", "BERJALAN"] as const;

    if (!allowedStatus.includes(proyek.status)) {
      return NextResponse.json(
        {
          error: `Proyek tidak dapat menerima perubahan material. Status: ${proyek.status}`,
        },
        { status: 400 },
      );
    }

    // =====================================================
    // PAYLOAD UPDATE
    // =====================================================

    const payload: Partial<Omit<ProyekMaterial, "id">> = {
      tanggal: body.tanggal ?? existing.tanggal,

      id_kategori: body.id_kategori ?? existing.id_kategori,

      qty,

      satuan: body.satuan?.trim() ?? existing.satuan,

      harga,

      total,

      gudang:
        body.gudang !== undefined
          ? body.gudang?.trim() || null
          : existing.gudang,

      supplier:
        body.supplier !== undefined
          ? body.supplier?.trim() || null
          : existing.supplier,

      keterangan:
        body.keterangan !== undefined
          ? body.keterangan?.trim() || null
          : existing.keterangan,

      metode_pembayaran: body.metode_pembayaran ?? existing.metode_pembayaran,
    };

    // =====================================================
    // UPDATE DATABASE
    // =====================================================

    const { data, error } = await db
      .from("proyek_material")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("UPDATE PROYEK MATERIAL ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    // =====================================================
    // AUDIT LOG
    // =====================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_material",
      aksi: "UPDATE",
      id_referensi: id,
      data,
    });

    if (auditError) {
      console.error("AUDIT LOG ERROR:", auditError);

      return NextResponse.json(
        {
          error:
            "Material berhasil diperbarui tetapi audit log gagal disimpan.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Material proyek berhasil diperbarui.",
        data,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("PUT PROYEK MATERIAL ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "ID material wajib diisi.",
        },
        { status: 400 },
      );
    }

    const { data: material, error: materialError } = await db
      .from("proyek_material")
      .select("*")
      .eq("id", id)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        {
          error: "Material tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // MATERIAL SUDAH POSTING
    // =====================================================

    if (material.id_jurnal !== null) {
      return NextResponse.json(
        {
          error: "Material sudah diposting ke jurnal dan tidak dapat dihapus.",
        },
        { status: 409 },
      );
    }

    // =====================================================
    // DELETE
    // =====================================================

    const { error: deleteError } = await db
      .from("proyek_material")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DELETE PROYEK MATERIAL ERROR:", deleteError);

      return NextResponse.json(
        {
          error: deleteError.message,
        },
        { status: 500 },
      );
    }

    // =====================================================
    // AUDIT LOG
    // =====================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_material",
      aksi: "DELETE",
      id_referensi: id,
      data: material,
    });

    if (auditError) {
      console.error("AUDIT DELETE ERROR:", auditError);

      return NextResponse.json(
        {
          error: "Material berhasil dihapus tetapi audit log gagal disimpan.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Material proyek berhasil dihapus.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("DELETE PROYEK MATERIAL ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
