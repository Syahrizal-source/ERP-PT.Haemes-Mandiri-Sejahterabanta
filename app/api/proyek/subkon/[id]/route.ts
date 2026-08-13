import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import {
  proyekSubkonSchema,
  ProyekSubkonRequest,
} from "@/lib/validators/proyekSubkon";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   GET DETAIL SUBKON
   ========================================================= */

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from("proyek_subkon")
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
      throw error;
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Data subkon tidak ditemukan.",
      },
      {
        status: 404,
      },
    );
  }
}

/* =========================================================
   UPDATE SUBKON
   ========================================================= */

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // =====================================================
    // BACA BODY HANYA SEKALI
    // =====================================================

    const json: unknown = await req.json();

    const body: ProyekSubkonRequest = proyekSubkonSchema.parse(json);

    // =====================================================
    // CEK DATA SUBKON
    // =====================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_subkon")
      .select(
        `
          id,
          id_proyek,
          id_kategori,
          no_bukti,
          tanggal,
          nama_vendor,
          pekerjaan,
          nilai_kontrak,
          metode_pembayaran,
          periode,
          status,
          id_jurnal,
          created_by,
          keterangan
          `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Data subkon tidak ditemukan.");
    }

    // =====================================================
    // VALIDASI PROYEK
    // =====================================================

    if (body.id_proyek !== existing.id_proyek) {
      throw new Error("Subkon tidak boleh dipindahkan ke proyek lain.");
    }

    // =====================================================
    // VALIDASI NILAI
    // =====================================================

    if (body.nilai_kontrak <= 0) {
      throw new Error("Nilai kontrak harus lebih besar dari 0.");
    }

    // =====================================================
    // UPDATE FORM SUBKON
    //
    // JURNAL TIDAK DISENTUH.
    // =====================================================

    const payload = {
      nama_vendor: body.nama_vendor.trim(),
      pekerjaan: body.pekerjaan.trim(),
      nilai_kontrak: body.nilai_kontrak,
      metode_pembayaran: body.metode_pembayaran,
      periode: body.periode?.trim() || null,
      status: body.status,
      keterangan: body.keterangan?.trim() || null,
    };

    const { data, error } = await db
      .from("proyek_subkon")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // =====================================================
    // AUDIT LOG
    // =====================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_subkon",
      aksi: "UPDATE",
      id_referensi: id,
      data: {
        sebelum: {
          nama_vendor: existing.nama_vendor,
          pekerjaan: existing.pekerjaan,
          nilai_kontrak: existing.nilai_kontrak,
          metode_pembayaran: existing.metode_pembayaran,
          periode: existing.periode,
          status: existing.status,
          keterangan: existing.keterangan,
        },

        sesudah: {
          nama_vendor: data.nama_vendor,
          pekerjaan: data.pekerjaan,
          nilai_kontrak: data.nilai_kontrak,
          metode_pembayaran: data.metode_pembayaran,
          periode: data.periode,
          status: data.status,
          keterangan: data.keterangan,
        },

        id_jurnal: existing.id_jurnal,
        no_bukti: existing.no_bukti,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG UPDATE SUBKON:", auditError.message);
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,
      message:
        existing.id_jurnal !== null
          ? "Data form subkon berhasil diperbarui. Jurnal tetap tidak diubah."
          : "Data subkon berhasil diperbarui.",
      data,
    });
  } catch (err: unknown) {
    console.error("PUT SUBKON ERROR:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Terjadi kesalahan.",
      },
      {
        status: 400,
      },
    );
  }
}
/* =========================================================
   DELETE SUBKON
   ========================================================= */

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    /* =====================================================
       CEK DATA
       ===================================================== */

    const { data: existing, error: checkError } = await db
      .from("proyek_subkon")
      .select("*")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new Error("Data subkon tidak ditemukan.");
    }

    /* =====================================================
       CEK JURNAL
       ===================================================== */

    if (existing.id_jurnal !== null) {
      throw new Error(
        "Subkon sudah diposting ke jurnal dan tidak dapat dihapus.",
      );
    }

    /* =====================================================
       AUDIT SEBELUM DELETE
       ===================================================== */

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_subkon",
      aksi: "DELETE",
      id_referensi: id,
      data: existing,
    });

    if (auditError) {
      console.error("AUDIT LOG DELETE SUBKON:", auditError.message);
    }

    /* =====================================================
       DELETE
       ===================================================== */

    const { error: deleteError } = await db
      .from("proyek_subkon")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Subkon proyek berhasil dihapus.",
    });
  } catch (err: unknown) {
    console.error("DELETE SUBKON ERROR:", err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Terjadi kesalahan.",
      },
      {
        status: 400,
      },
    );
  }
}
