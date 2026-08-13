import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  proyekRealisasiSchema,
  type ProyekRealisasiRequest,
} from "@/lib/validators/proyekRealisasi";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// =====================================================
// GET DETAIL
// =====================================================

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { data, error } = await db
      .from("proyek_realisasi")
      .select(
        `
        *,
        rab:proyek_rab(
          id,
          id_proyek,
          id_kategori,
          uraian,
          volume,
          satuan,
          harga_satuan
        ),
        kategori:kategori_biaya_proyek(
          id,
          kode,
          nama,
          jenis,
          aktif
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Realisasi proyek tidak ditemukan.");
    }

    return NextResponse.json(data, {
      status: 200,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Realisasi proyek tidak ditemukan.",
      },
      {
        status: 404,
      },
    );
  }
}

// =====================================================
// UPDATE
// =====================================================

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const body: ProyekRealisasiRequest = proyekRealisasiSchema.parse(
      await req.json(),
    );

    // ===================================================
    // CEK DATA EXISTING
    // ===================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_realisasi")
      .select(
        `
        id,
        id_proyek,
        id_rab,
        id_kategori,
        id_jurnal,
        qty,
        harga,
        satuan
      `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error("Realisasi proyek tidak ditemukan.");
    }

    // ===================================================
    // JIKA SUDAH POSTED
    // TIDAK BOLEH DIUBAH
    // ===================================================

    if (existing.id_jurnal !== null) {
      throw new Error(
        "Realisasi sudah diposting ke jurnal dan tidak dapat diubah.",
      );
    }

    // ===================================================
    // CEK PROYEK
    // ===================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    const allowedStatus = ["OPEN", "BERJALAN"] as const;

    if (!allowedStatus.includes(proyek.status)) {
      throw new Error(
        `Proyek tidak dapat menerima perubahan realisasi. Status: ${proyek.status}`,
      );
    }

    // ===================================================
    // CEK KATEGORI
    // ===================================================

    const { data: kategori, error: kategoriError } = await db
      .from("kategori_biaya_proyek")
      .select("id, kode, nama, jenis, aktif")
      .eq("id", body.id_kategori)
      .single();

    if (kategoriError || !kategori) {
      throw new Error("Kategori biaya proyek tidak ditemukan.");
    }

    if (!kategori.aktif) {
      throw new Error("Kategori biaya proyek sudah tidak aktif.");
    }

    // ===================================================
    // VALIDASI RAB / RAP
    // ===================================================

    if (body.id_rab) {
      const { data: rab, error: rabError } = await db
        .from("proyek_rab")
        .select(
          "id, id_proyek, id_kategori, uraian, volume, satuan, harga_satuan",
        )
        .eq("id", body.id_rab)
        .eq("id_proyek", body.id_proyek)
        .single();

      if (rabError || !rab) {
        throw new Error("Item RAB tidak ditemukan.");
      }

      const { data: rap, error: rapError } = await db
        .from("rap_proyek")
        .select("id, id_rab, id_proyek, qty, satuan, harga")
        .eq("id_rab", body.id_rab)
        .eq("id_proyek", body.id_proyek)
        .single();

      if (rapError || !rap) {
        throw new Error("Item RAP tidak ditemukan.");
      }

      const rapQty = Number(rap.qty);
      const rapHarga = Number(rap.harga);

      // ================================================
      // HITUNG REALISASI LAIN
      // ================================================

      const { data: realisasiLain, error: realisasiError } = await db
        .from("proyek_realisasi")
        .select("id, qty")
        .eq("id_rab", body.id_rab)
        .neq("id", id);

      if (realisasiError) {
        throw new Error(
          `Gagal menghitung realisasi sebelumnya: ${realisasiError.message}`,
        );
      }

      const qtyTerpakai = (realisasiLain ?? []).reduce(
        (sum, item) => sum + Number(item.qty),
        0,
      );

      // ================================================
      // VALIDASI QTY
      // ================================================

      if (qtyTerpakai + body.qty > rapQty) {
        const sisaQty = rapQty - qtyTerpakai;

        throw new Error(
          `Qty Realisasi melebihi RAP. Sisa qty RAP: ${sisaQty}.`,
        );
      }

      // ================================================
      // VALIDASI HARGA
      // ================================================

      if (body.harga > rapHarga) {
        throw new Error("Harga realisasi melebihi harga RAP.");
      }

      // ================================================
      // VALIDASI SATUAN
      // ================================================

      if (rap.satuan !== null && body.satuan !== rap.satuan) {
        throw new Error(
          `Satuan realisasi harus sama dengan RAP (${rap.satuan}).`,
        );
      }
    }

    // ===================================================
    // HITUNG TOTAL UNTUK VALIDASI
    // ===================================================

    const qty = Number(body.qty);
    const harga = Number(body.harga);
    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Total realisasi tidak valid.");
    }

    // ===================================================
    // UPDATE
    // ===================================================
    //
    // total TIDAK di-update karena GENERATED ALWAYS.
    // id_jurnal juga TIDAK disentuh.
    // ===================================================

    const { data, error } = await db
      .from("proyek_realisasi")
      .update({
        id_proyek: body.id_proyek,
        id_rab: body.id_rab ?? null,
        id_kategori: body.id_kategori,
        tanggal: body.tanggal,
        no_bukti: body.no_bukti,
        uraian: body.uraian.trim(),
        qty,
        satuan: body.satuan?.trim() || null,
        harga,
        metode_pembayaran: body.metode_pembayaran,
        keterangan: body.keterangan?.trim() || null,
        created_by: body.created_by ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal memperbarui realisasi proyek.");
    }

    // ===================================================
    // AUDIT LOG
    // ===================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_realisasi",
      aksi: "UPDATE",
      id_referensi: id,
      data: {
        id_realisasi: id,
        id_proyek: data.id_proyek,
        kode_proyek: proyek.kode_proyek,
        kode_accounting_proyek: proyek.kode_accounting_proyek,
        id_rab: data.id_rab,
        id_kategori: data.id_kategori,
        kategori: kategori.nama,
        kode_kategori: kategori.kode,
        no_bukti: data.no_bukti,
        uraian: data.uraian,
        qty: data.qty,
        satuan: data.satuan,
        harga: data.harga,
        total: data.total,
        metode_pembayaran: data.metode_pembayaran,
        tanggal: data.tanggal,
        keterangan: data.keterangan,
      },
    });

    if (auditError) {
      throw new Error(
        `Data berhasil diperbarui tetapi audit log gagal: ${auditError.message}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Realisasi proyek berhasil diperbarui.",
        data,
      },
      {
        status: 200,
      },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memperbarui realisasi proyek.",
      },
      {
        status: 400,
      },
    );
  }
}

// =====================================================
// DELETE
// =====================================================

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // ===================================================
    // CEK DATA
    // ===================================================

    const { data: existing, error: checkError } = await db
      .from("proyek_realisasi")
      .select("*")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      throw new Error("Realisasi proyek tidak ditemukan.");
    }

    // ===================================================
    // JIKA SUDAH POSTED
    // TIDAK BOLEH DIHAPUS
    // ===================================================

    if (existing.id_jurnal !== null) {
      throw new Error(
        "Realisasi sudah diposting ke jurnal dan tidak dapat dihapus.",
      );
    }

    // ===================================================
    // DELETE
    // ===================================================

    const { error } = await db.from("proyek_realisasi").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    // ===================================================
    // AUDIT LOG
    // ===================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_realisasi",
      aksi: "DELETE",
      id_referensi: id,
      data: existing,
    });

    if (auditError) {
      throw new Error(
        `Realisasi berhasil dihapus tetapi audit log gagal: ${auditError.message}`,
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Realisasi proyek berhasil dihapus.",
      },
      {
        status: 200,
      },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menghapus realisasi proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
