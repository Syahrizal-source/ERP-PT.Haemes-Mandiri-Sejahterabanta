import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { ProyekOperasional } from "@/types/proyek";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type MetodePembayaranOperasional =
  | "KAS"
  | "KAS_BESAR"
  | "KAS_KECIL"
  | "BANK"
  | "HUTANG";

type StatusOperasional = "DRAFT" | "POSTED" | "DIBATALKAN";

// =====================================================
// PUT
// =====================================================
//
// Hanya boleh mengubah transaksi yang BELUM POSTED.
//
// Kalau id_jurnal sudah terisi:
//   TOLAK UPDATE
//
// Karena perubahan transaksi setelah posting akan
// menyebabkan transaksi operasional tidak sama dengan jurnal.
// =====================================================

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    // =================================================
    // 1. BACA BODY
    // =================================================

    const body: Partial<Omit<ProyekOperasional, "id">> = await req.json();

    // =================================================
    // 2. AMBIL DATA LAMA
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_operasional")
      .select("*")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Data operasional proyek tidak ditemukan.");
    }

    // =================================================
    // 3. TRANSAKSI POSTED TIDAK BOLEH DIUBAH
    // =================================================

    if (existing.id_jurnal !== null) {
      throw new Error(
        `Operasional ${existing.no_bukti} sudah diposting ke jurnal dan tidak dapat diubah.`,
      );
    }

    // =================================================
    // 4. TENTUKAN NILAI FINAL
    //
    // Jika field tidak dikirim, gunakan data lama.
    // =================================================

    const idProyek = body.id_proyek ?? existing.id_proyek;

    const idKategori = body.id_kategori ?? existing.id_kategori;

    const tanggal = body.tanggal ?? existing.tanggal;

    const noBukti = body.no_bukti?.trim() ?? existing.no_bukti;

    const uraian = body.uraian?.trim() ?? existing.uraian;

    const qty =
      body.qty !== undefined ? Number(body.qty) : Number(existing.qty);

    const harga =
      body.harga !== undefined ? Number(body.harga) : Number(existing.harga);

    const satuan =
      body.satuan !== undefined ? body.satuan?.trim() || null : existing.satuan;

    const supplier =
      body.supplier !== undefined
        ? body.supplier?.trim() || null
        : existing.supplier;

    const periode =
      body.periode !== undefined
        ? body.periode?.trim() || null
        : existing.periode;

    const keterangan =
      body.keterangan !== undefined
        ? body.keterangan?.trim() || null
        : existing.keterangan;

    const metodePembayaran =
      body.metode_pembayaran ?? existing.metode_pembayaran;

    const status = body.status ?? existing.status;

    // =================================================
    // 5. VALIDASI NO BUKTI
    //
    // Database:
    // NOT NULL + UNIQUE
    // =================================================

    if (!noBukti || noBukti.trim() === "") {
      throw new Error("Nomor bukti wajib diisi.");
    }

    if (noBukti.length > 50) {
      throw new Error("Nomor bukti maksimal 50 karakter.");
    }

    // =================================================
    // 6. CEK DUPLIKAT NO BUKTI
    // =================================================

    const { data: duplicateNoBukti, error: duplicateError } = await db
      .from("proyek_operasional")
      .select("id")
      .eq("no_bukti", noBukti)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(duplicateError.message);
    }

    if (duplicateNoBukti) {
      throw new Error(`Nomor bukti ${noBukti} sudah digunakan.`);
    }

    // =================================================
    // 7. VALIDASI URAIAN
    // =================================================

    if (!uraian || uraian.trim() === "") {
      throw new Error("Uraian wajib diisi.");
    }

    if (uraian.length > 200) {
      throw new Error("Uraian maksimal 200 karakter.");
    }

    // =================================================
    // 8. VALIDASI QTY
    //
    // Database:
    // qty >= 0
    //
    // Untuk transaksi operasional kita gunakan > 0
    // supaya total transaksi tidak menjadi 0.
    // =================================================

    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error("Qty harus lebih besar dari 0.");
    }

    // =================================================
    // 9. VALIDASI HARGA
    //
    // Database:
    // harga >= 0
    // =================================================

    if (!Number.isFinite(harga) || harga < 0) {
      throw new Error("Harga tidak boleh negatif.");
    }

    // =================================================
    // 10. HITUNG ULANG TOTAL
    // =================================================

    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Total operasional harus lebih besar dari 0.");
    }

    // =================================================
    // 11. VALIDASI METODE PEMBAYARAN
    //
    // SESUAI DATABASE YANG KITA PERBAIKI
    // =================================================

    const validMetodePembayaran: readonly MetodePembayaranOperasional[] = [
      "KAS",
      "KAS_BESAR",
      "KAS_KECIL",
      "BANK",
      "HUTANG",
    ];

    if (
      !validMetodePembayaran.includes(
        metodePembayaran as MetodePembayaranOperasional,
      )
    ) {
      throw new Error("Metode pembayaran operasional tidak valid.");
    }

    // =================================================
    // 12. VALIDASI STATUS
    // =================================================

    const validStatus: readonly StatusOperasional[] = [
      "DRAFT",
      "POSTED",
      "DIBATALKAN",
    ];

    if (!validStatus.includes(status as StatusOperasional)) {
      throw new Error("Status operasional tidak valid.");
    }

    // =================================================
    // 13. VALIDASI PROYEK
    // =================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select(
        `
          id,
          kode_proyek,
          nama_proyek,
          status
        `,
      )
      .eq("id", idProyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    // Transaksi belum posted hanya boleh berada
    // pada proyek OPEN / BERJALAN.
    if (proyek.status !== "OPEN" && proyek.status !== "BERJALAN") {
      throw new Error(
        `Status proyek ${proyek.status} tidak dapat menerima perubahan operasional.`,
      );
    }

    // =================================================
    // 14. VALIDASI KATEGORI
    // =================================================

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select(
        `
          id,
          kode,
          nama,
          jenis,
          aktif
        `,
      )
      .eq("id", idKategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori operasional tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error(`Kategori ${kategori.nama} sudah tidak aktif.`);
    }

    // =================================================
    // 15. PAYLOAD
    //
    // JANGAN update:
    // - id_jurnal
    // - created_at
    // - updated_at
    //
    // updated_at akan ditangani trigger database.
    // =================================================

    const payload = {
      id_proyek: idProyek,
      id_kategori: idKategori,
      no_bukti: noBukti,
      tanggal,
      uraian,
      qty,
      satuan,
      harga,
      total,
      supplier,
      metode_pembayaran: metodePembayaran as MetodePembayaranOperasional,
      periode,
      status: status as StatusOperasional,
      keterangan,
      created_by:
        body.created_by !== undefined ? body.created_by : existing.created_by,
    };

    // =================================================
    // 16. UPDATE
    //
    // Pastikan id_jurnal masih NULL.
    // =================================================

    const { data, error } = await db
      .from("proyek_operasional")
      .update(payload)
      .eq("id", id)
      .is("id_jurnal", null)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Operasional tidak dapat diperbarui.");
    }

    // =================================================
    // 17. AUDIT LOG
    // =================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_operasional",
      aksi: "UPDATE",
      id_referensi: id,
      data: {
        before: existing,
        after: data,
      },
    });

    if (auditError) {
      console.error("AUDIT LOG OPERASIONAL UPDATE:", auditError.message);
    }

    // =================================================
    // 18. RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      message: "Operasional proyek berhasil diperbarui.",
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui operasional proyek.",
      },
      {
        status: 400,
      },
    );
  }
}

// =====================================================
// DELETE
//
// Hanya boleh menghapus transaksi BELUM POSTED.
// =====================================================

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    // =================================================
    // 1. AMBIL DATA
    // =================================================

    const { data: operasional, error: findError } = await db
      .from("proyek_operasional")
      .select("*")
      .eq("id", id)
      .single();

    if (findError || !operasional) {
      throw new Error("Data operasional proyek tidak ditemukan.");
    }

    // =================================================
    // 2. CEGAH DELETE POSTED
    // =================================================

    if (operasional.id_jurnal !== null) {
      throw new Error(
        `Operasional ${operasional.no_bukti} sudah diposting ke jurnal dan tidak dapat dihapus.`,
      );
    }

    // =================================================
    // 3. AUDIT SEBELUM DELETE
    // =================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_operasional",
      aksi: "DELETE",
      id_referensi: id,
      data: operasional,
    });

    if (auditError) {
      console.error("AUDIT LOG OPERASIONAL DELETE:", auditError.message);
    }

    // =================================================
    // 4. DELETE
    //
    // Pastikan id_jurnal masih NULL.
    // =================================================

    const { error: deleteError } = await db
      .from("proyek_operasional")
      .delete()
      .eq("id", id)
      .is("id_jurnal", null);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // =================================================
    // 5. RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      message: "Operasional proyek berhasil dihapus.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus operasional proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
