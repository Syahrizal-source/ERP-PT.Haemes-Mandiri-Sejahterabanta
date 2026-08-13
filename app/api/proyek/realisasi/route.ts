import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  proyekRealisasiSchema,
  type ProyekRealisasiRequest,
} from "@/lib/validators/proyekRealisasi";

import { postProyekRealisasi } from "@/lib/accounting/postProyekRealisasi";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const idProyek = searchParams.get("id_proyek");

    let query = db
      .from("proyek_realisasi")
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
      throw new Error(error.message);
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
            : "Terjadi kesalahan saat mengambil realisasi proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ProyekRealisasiRequest = proyekRealisasiSchema.parse(
      await req.json(),
    );

    // =====================================================
    // PASTIKAN PROYEK ADA
    // =====================================================

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, kode_accounting_proyek, nama_proyek, status")
      .eq("id", body.id_proyek)
      .single();

    if (proyekError || !proyek) {
      throw new Error("Proyek tidak ditemukan.");
    }

    // =====================================================
    // STATUS PROYEK
    // =====================================================

    const allowedStatus = ["OPEN", "BERJALAN"] as const;

    if (!allowedStatus.includes(proyek.status)) {
      throw new Error(
        `Proyek tidak dapat menerima realisasi. Status: ${proyek.status}`,
      );
    }

    // =====================================================
    // PASTIKAN KATEGORI ADA
    // =====================================================

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

    // =====================================================
    // VALIDASI RAB / RAP
    // =====================================================
    //
    // id_rab nullable.
    // Jika ada id_rab, baru lakukan validasi RAP.
    // =====================================================

    let rapQty: number | null = null;
    let rapHarga: number | null = null;
    let rapSatuan: string | null = null;

    if (body.id_rab) {
      const { data: rab, error: rabError } = await db
        .from("proyek_rab")
        .select("id, id_proyek, id_kategori")
        .eq("id", body.id_rab)
        .eq("id_proyek", body.id_proyek)
        .single();

      if (rabError || !rab) {
        throw new Error("Item RAB tidak ditemukan.");
      }

      // ===================================================
      // RAP
      // ===================================================

      const { data: rap, error: rapError } = await db
        .from("rap_proyek")
        .select("id, id_rab, id_proyek, qty, harga, satuan")
        .eq("id_rab", body.id_rab)
        .eq("id_proyek", body.id_proyek)
        .single();

      if (rapError || !rap) {
        throw new Error("Item RAP tidak ditemukan.");
      }

      rapQty = Number(rap.qty);
      rapHarga = Number(rap.harga);
      rapSatuan = rap.satuan ?? null;

      // ===================================================
      // TOTAL QTY REALISASI SEBELUMNYA
      // ===================================================

      const { data: realisasiSebelumnya, error: realisasiError } = await db
        .from("proyek_realisasi")
        .select("qty")
        .eq("id_rab", body.id_rab);

      if (realisasiError) {
        throw new Error(
          `Gagal menghitung realisasi sebelumnya: ${realisasiError.message}`,
        );
      }

      const qtyTerpakai = (realisasiSebelumnya ?? []).reduce(
        (sum, item) => sum + Number(item.qty),
        0,
      );

      // ===================================================
      // VALIDASI QTY RAP
      // ===================================================

      if (qtyTerpakai + body.qty > rapQty) {
        throw new Error(
          `Qty Realisasi melebihi RAP. Sisa qty RAP: ${rapQty - qtyTerpakai}.`,
        );
      }

      // ===================================================
      // VALIDASI HARGA RAP
      // ===================================================

      if (body.harga > rapHarga) {
        throw new Error("Harga realisasi melebihi harga RAP.");
      }

      // ===================================================
      // VALIDASI SATUAN
      // ===================================================

      if (rapSatuan && body.satuan !== rapSatuan) {
        throw new Error(
          `Satuan realisasi harus sama dengan RAP (${rapSatuan}).`,
        );
      }
    }

    // =====================================================
    // TOTAL
    // =====================================================

    const qty = Number(body.qty);
    const harga = Number(body.harga);
    const total = qty * harga;

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Total realisasi tidak valid.");
    }

    // =====================================================
    // INSERT REALISASI
    // =====================================================
    //
    // Jangan insert total.
    // Database menghitung total secara GENERATED ALWAYS.
    // =====================================================

    const { data, error } = await db
      .from("proyek_realisasi")
      .insert({
        id_proyek: body.id_proyek,
        id_rab: body.id_rab ?? null,
        id_kategori: body.id_kategori,
        tanggal: body.tanggal,
        no_bukti: body.no_bukti,
        uraian: body.uraian.trim(),
        qty: qty,
        satuan: body.satuan?.trim() || null,
        harga: harga,
        metode_pembayaran: body.metode_pembayaran,
        keterangan: body.keterangan?.trim() || null,
        created_by: body.created_by ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Gagal menyimpan realisasi proyek.");
    }

    // =====================================================
    // POSTING JURNAL
    // =====================================================

    const idJurnal = await postProyekRealisasi({
      id_proyek: data.id_proyek,
      id_rab: data.id_rab,
      id_kategori: data.id_kategori,
      tanggal: data.tanggal,
      no_bukti: data.no_bukti,
      uraian: data.uraian,
      qty: Number(data.qty),
      satuan: data.satuan,
      harga: Number(data.harga),
      metode_pembayaran: data.metode_pembayaran,
      keterangan: data.keterangan,
      created_by: data.created_by,
      id_realisasi: data.id,
    });

    if (!idJurnal) {
      throw new Error("Posting jurnal realisasi gagal.");
    }

    // =====================================================
    // AMBIL DATA FINAL
    // =====================================================

    const { data: result, error: resultError } = await db
      .from("proyek_realisasi")
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
      .eq("id", data.id)
      .single();

    if (resultError || !result) {
      throw new Error(
        resultError?.message ??
          "Data realisasi berhasil dibuat tetapi gagal diambil kembali.",
      );
    }

    // =====================================================
    // AUDIT LOG
    // =====================================================

    const { error: auditError } = await db.from("audit_log").insert({
      modul: "PROYEK",
      tabel: "proyek_realisasi",
      aksi: "INSERT",
      id_referensi: data.id,
      data: {
        id_realisasi: data.id,
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
        id_jurnal: idJurnal,
      },
    });

    if (auditError) {
      throw new Error(
        `Realisasi dan jurnal berhasil dibuat, tetapi audit log gagal: ${auditError.message}`,
      );
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Realisasi proyek berhasil disimpan.",
        id_jurnal: idJurnal,
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menyimpan realisasi proyek.",
      },
      {
        status: 400,
      },
    );
  }
}
