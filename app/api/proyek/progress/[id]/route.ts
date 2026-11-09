import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  proyekProgressSchema,
  type ProyekProgressRequest,
} from "@/lib/validators/proyekprogress";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type MetodePembayaranProgress =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

type StatusProgress = "ON_PROGRESS" | "SELESAI" | "TERLAMBAT" | "DIBATALKAN";

// =====================================================
// PUT
// Update Progress yang BELUM POSTED
// =====================================================

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    // =================================================
    // 1. VALIDASI REQUEST
    // =================================================

    const body: ProyekProgressRequest = proyekProgressSchema.parse(
      await req.json(),
    );

    // =================================================
    // 2. AMBIL DATA LAMA
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_progress")
      .select(
        `
        id,
        id_proyek,
        no_bukti,
        id_jurnal,
        target_volume,
        realisasi_volume,
        nilai_progress,
        metode_pembayaran,
        status
        `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Data progress proyek tidak ditemukan.");
    }

    // =================================================
    // 3. PROGRESS SUDAH POSTED
    // TIDAK BOLEH DIUBAH
    // =================================================

    if (existing.id_jurnal !== null) {
      throw new Error(
        `Progress ${existing.no_bukti} sudah diposting ke jurnal dan tidak dapat diubah.`,
      );
    }

    // =================================================
    // 4. VALIDASI PROYEK
    // =================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, nama_proyek, status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    // =================================================
    // 5. PROGRESS TIDAK BOLEH PINDAH PROYEK
    // =================================================

    if (existing.id_proyek !== body.id_proyek) {
      throw new Error("Progress tidak boleh dipindahkan ke proyek lain.");
    }

    // =================================================
    // 6. STATUS PROYEK
    // =================================================

    if (proyek.status !== "OPEN" && proyek.status !== "BERJALAN") {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima perubahan progress.`,
      );
    }

    // =================================================
    // 7. VALIDASI VOLUME
    // Database: >= 0
    // =================================================

    const targetVolume = Number(body.target_volume);
    const realisasiVolume = Number(body.realisasi_volume);
    const nilaiProgress = Number(body.nilai_progress);

    if (!Number.isFinite(targetVolume) || targetVolume < 0) {
      throw new Error("Target Volume harus berupa angka >= 0.");
    }

    if (!Number.isFinite(realisasiVolume) || realisasiVolume < 0) {
      throw new Error("Realisasi Volume harus berupa angka >= 0.");
    }

    if (!Number.isFinite(nilaiProgress) || nilaiProgress <= 0) {
      throw new Error("Nilai Progress harus lebih besar dari 0.");
    }

    // =================================================
    // 8. VALIDASI METODE PEMBAYARAN
    // Sesuai database
    // =================================================

    const metodePembayaran: MetodePembayaranProgress = body.metode_pembayaran;

    if (
      metodePembayaran !== "KAS" &&
      metodePembayaran !== "KAS_BESAR" &&
      metodePembayaran !== "KAS_KECIL" &&
      metodePembayaran !== "BANK" &&
      metodePembayaran !== "HUTANG"
    ) {
      throw new Error("Metode pembayaran progress tidak valid.");
    }

    // =================================================
    // 9. VALIDASI STATUS
    // =================================================

    const statusProgress: StatusProgress = body.status;

    if (
      statusProgress !== "ON_PROGRESS" &&
      statusProgress !== "SELESAI" &&
      statusProgress !== "TERLAMBAT" &&
      statusProgress !== "DIBATALKAN"
    ) {
      throw new Error("Status progress tidak valid.");
    }

    // =================================================
    // 10. NO BUKTI UNIQUE
    // Database: NOT NULL + UNIQUE
    // =================================================

    const noBukti = body.no_bukti.trim();

    const { data: duplicateNoBukti, error: duplicateError } = await db
      .from("proyek_progress")
      .select("id")
      .eq("no_bukti", noBukti)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(`Gagal memeriksa nomor bukti: ${duplicateError.message}`);
    }

    if (duplicateNoBukti) {
      throw new Error(`Nomor bukti ${noBukti} sudah digunakan.`);
    }

    // =================================================
    // 11. PAYLOAD
    //
    // JANGAN UPDATE:
    // - id_jurnal
    // - deviasi
    // - progress_persen
    // - created_at
    // - updated_at
    // - created_by
    //
    // deviasi & progress_persen dihitung database.
    // updated_at dihitung trigger database.
    // =================================================

    const payload = {
      id_proyek: body.id_proyek,
      tanggal: body.tanggal,
      no_bukti: noBukti,
      target_volume: targetVolume,
      realisasi_volume: realisasiVolume,
      satuan: body.satuan,
      nilai_progress: nilaiProgress,
      metode_pembayaran: metodePembayaran,
      status: statusProgress,
      periode: body.periode ?? null,
      lokasi: body.lokasi ?? null,
      pic: body.pic ?? null,
      keterangan: body.keterangan ?? null,
    };

    // =================================================
    // 12. UPDATE
    //
    // id_jurnal harus tetap NULL.
    // =================================================

    const { data, error } = await db
      .from("proyek_progress")
      .update(payload)
      .eq("id", id)
      .is("id_jurnal", null)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // =================================================
    // 13. AUDIT LOG
    // =================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_progress",
      aksi: "UPDATE",
      id_referensi: id,
      data,
    });

    if (auditError) {
      throw new Error(
        `Progress berhasil diperbarui tetapi audit log gagal: ${auditError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Progress proyek berhasil diperbarui.",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui progress proyek.",
      },
      {
        status: 400,
      },
    );
  }
}

// =====================================================
// DELETE
// Hanya Progress yang BELUM POSTED
// =====================================================

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    // =================================================
    // 1. AMBIL DATA
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_progress")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Data progress proyek tidak ditemukan.");
    }

    // =================================================
    // 2. JANGAN HAPUS YANG SUDAH POSTED
    // =================================================

    if (existing.id_jurnal !== null) {
      throw new Error(
        `Progress ${existing.no_bukti} sudah diposting ke jurnal dan tidak dapat dihapus.`,
      );
    }

    // =================================================
    // 3. AUDIT LOG SEBELUM DELETE
    // =================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_progress",
      aksi: "DELETE",
      id_referensi: id,
      data: existing,
    });

    if (auditError) {
      throw new Error(`Gagal membuat audit log: ${auditError.message}`);
    }

    // =================================================
    // 4. DELETE
    //
    // Tetap lindungi dari menghapus data yang sudah
    // mendapatkan id_jurnal.
    // =================================================

    const { data: deleted, error: deleteError } = await db
      .from("proyek_progress")
      .delete()
      .eq("id", id)
      .is("id_jurnal", null)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (!deleted) {
      throw new Error(
        "Progress tidak dapat dihapus. Data mungkin sudah diposting.",
      );
    }

    return NextResponse.json({
      success: true,
      message: "Progress proyek berhasil dihapus.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus progress proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
