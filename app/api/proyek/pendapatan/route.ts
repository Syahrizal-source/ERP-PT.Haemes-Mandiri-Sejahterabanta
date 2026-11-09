import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  pendapatanProyekSchema,
  normalizePendapatanProyek,
  hitungPendapatanProyek,
  validatePendapatanProyek,
} from "@/lib/validators/pendapatanProyek";

import { postPendapatanProyek } from "@/lib/accounting/postPendapatanProyek";

/* ============================================================
   GET /api/proyek/pendapatan
============================================================ */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    const idProyek = searchParams.get("id_proyek");
    const tanggalDari = searchParams.get("tanggal_dari");
    const tanggalSampai = searchParams.get("tanggal_sampai");

    let query = db
      .from("pendapatan_proyek")
      .select(
        `
        id,
        id_proyek,
        tanggal,
        no_bukti,
        keterangan,
        nilai_pendapatan,
        jenis_pajak,
        tarif_pajak,
        nilai_pajak,
        nilai_bersih,
        id_jurnal,
        jenis_transaksi,
        klasifikasi_pendapatan,
        kode_pajak,
        dpp_pajak,
        tanggal_regulasi_pajak,
        created_at,
        updated_at
      `,
      )
      .order("tanggal", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (idProyek) {
      query = query.eq("id_proyek", idProyek);
    }

    if (tanggalDari) {
      query = query.gte("tanggal", tanggalDari);
    }

    if (tanggalSampai) {
      query = query.lte("tanggal", tanggalSampai);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: `Gagal mengambil data pendapatan proyek: ${error.message}`,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(data ?? [], {
      status: 200,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengambil data pendapatan proyek.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   POST /api/proyek/pendapatan

   FLOW:
   1. Request body
   2. Validasi Zod
   3. Normalisasi
   4. Validasi business rule
   5. Hitung pajak
   6. Periksa proyek
   7. Periksa nomor bukti
   8. Insert pendapatan
   9. Posting jurnal
   10. Update id_jurnal
============================================================ */

export async function POST(request: NextRequest): Promise<NextResponse> {
  let insertedPendapatanId: number | null = null;

  try {
    /* ========================================================
       REQUEST BODY
    ======================================================== */

    const body: unknown = await request.json();

    /* ========================================================
       VALIDASI ZOD
    ======================================================== */

    const parsed = pendapatanProyekSchema.parse(body);

    /* ========================================================
       NORMALISASI
    ======================================================== */

    const normalized = normalizePendapatanProyek(parsed);

    /* ========================================================
       VALIDASI BUSINESS RULE
    ======================================================== */

    validatePendapatanProyek(normalized);

    /* ========================================================
       HITUNG PAJAK
    ======================================================== */

    const computed = hitungPendapatanProyek(normalized);

    const nilaiPendapatan = Number(normalized.nilai_pendapatan.toFixed(2));

    const nilaiPajak = Number(computed.nilai_pajak.toFixed(2));

    const nilaiBersih = Number(computed.nilai_bersih.toFixed(2));

    if (!Number.isFinite(nilaiPendapatan) || nilaiPendapatan <= 0) {
      return NextResponse.json(
        {
          error: "Nilai transaksi harus lebih besar dari 0.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(nilaiPajak) || nilaiPajak < 0) {
      return NextResponse.json(
        {
          error: "Nilai pajak tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(nilaiBersih) || nilaiBersih < 0) {
      return NextResponse.json(
        {
          error: "Nilai bersih tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       PASTIKAN PROYEK ADA
    ======================================================== */

    const { data: proyek, error: proyekError } = await db
      .from("proyek_master")
      .select("id, kode_proyek, nama_proyek, customer")
      .eq("id", normalized.id_proyek)
      .maybeSingle();

    if (proyekError) {
      return NextResponse.json(
        {
          error: `Gagal memeriksa proyek: ${proyekError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (!proyek) {
      return NextResponse.json(
        {
          error: "Proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       CEK NOMOR BUKTI
    ======================================================== */

    const { data: existing, error: existingError } = await db
      .from("pendapatan_proyek")
      .select("id, id_jurnal")
      .eq("no_bukti", normalized.no_bukti)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Gagal memeriksa nomor bukti: ${existingError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: "Nomor bukti pendapatan sudah digunakan.",
        },
        {
          status: 409,
        },
      );
    }

    /* ========================================================
       INSERT PENDAPATAN PROYEK
    ======================================================== */

    const { data: pendapatan, error: insertError } = await db
      .from("pendapatan_proyek")
      .insert({
        id_proyek: normalized.id_proyek,
        tanggal: normalized.tanggal,
        no_bukti: normalized.no_bukti,
        keterangan: normalized.keterangan,

        nilai_pendapatan: nilaiPendapatan,

        jenis_pajak: normalized.jenis_pajak,
        tarif_pajak: computed.tarif_pajak,
        nilai_pajak: nilaiPajak,
        nilai_bersih: nilaiBersih,

        jenis_transaksi: normalized.jenis_transaksi,

        klasifikasi_pendapatan: normalized.klasifikasi_pendapatan,

        kode_pajak: normalized.kode_pajak,

        dpp_pajak: normalized.dpp_pajak,

        tanggal_regulasi_pajak: normalized.tanggal_regulasi_pajak,
      })
      .select(
        `
        id,
        id_proyek,
        tanggal,
        no_bukti,
        keterangan,
        nilai_pendapatan,
        jenis_pajak,
        tarif_pajak,
        nilai_pajak,
        nilai_bersih,
        jenis_transaksi,
        klasifikasi_pendapatan,
        kode_pajak,
        dpp_pajak,
        tanggal_regulasi_pajak,
        id_jurnal,
        created_at,
        updated_at
      `,
      )
      .single();

    if (insertError || !pendapatan) {
      return NextResponse.json(
        {
          error: `Gagal menyimpan pendapatan proyek: ${
            insertError?.message ?? "Data tidak berhasil disimpan."
          }`,
        },
        {
          status: 500,
        },
      );
    }

    insertedPendapatanId = Number(pendapatan.id);

    if (
      !Number.isSafeInteger(insertedPendapatanId) ||
      insertedPendapatanId <= 0
    ) {
      return NextResponse.json(
        {
          error: "ID pendapatan proyek yang tersimpan tidak valid.",
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       POSTING JURNAL
    ======================================================== */

    let idJurnal: number;

    try {
      idJurnal = await postPendapatanProyek({
        ...normalized,
        id_pendapatan: insertedPendapatanId,
      });
    } catch (postingError: unknown) {
      /*
       * Posting gagal.
       * Data sumber dibersihkan agar tidak menjadi transaksi
       * pendapatan tanpa jurnal, sesuai alur rollback sebelumnya.
       */
      const message =
        postingError instanceof Error
          ? postingError.message
          : "Gagal melakukan posting jurnal pendapatan proyek.";

      const { error: rollbackError } = await db
        .from("pendapatan_proyek")
        .delete()
        .eq("id", insertedPendapatanId);

      if (rollbackError) {
        return NextResponse.json(
          {
            error:
              `${message} Data pendapatan gagal dihapus kembali: ` +
              rollbackError.message,
            id_pendapatan: insertedPendapatanId,
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       VALIDASI HASIL POSTING
    ======================================================== */

    if (!Number.isSafeInteger(idJurnal) || idJurnal <= 0) {
      /*
       * ID jurnal tidak valid. Data pendapatan tetap dipertahankan
       * agar tidak menghapus sumber transaksi secara sembarangan.
       */
      return NextResponse.json(
        {
          error:
            "Posting jurnal memberikan ID yang tidak valid. Data pendapatan dipertahankan untuk pemeriksaan.",
          id_pendapatan: insertedPendapatanId,
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       UPDATE ID JURNAL
    ======================================================== */

    const { data: result, error: updateError } = await db
      .from("pendapatan_proyek")
      .update({
        id_jurnal: idJurnal,
      })
      .eq("id", insertedPendapatanId)
      .select(
        `
        id,
        id_proyek,
        tanggal,
        no_bukti,
        keterangan,
        nilai_pendapatan,
        jenis_pajak,
        tarif_pajak,
        nilai_pajak,
        nilai_bersih,
        jenis_transaksi,
        klasifikasi_pendapatan,
        kode_pajak,
        dpp_pajak,
        tanggal_regulasi_pajak,
        id_jurnal,
        created_at,
        updated_at
      `,
      )
      .single();

    if (updateError || !result) {
      /*
       * Jurnal sudah terposting.
       * Jangan menghapus data pendapatan karena jurnal sudah ada.
       */
      return NextResponse.json(
        {
          error:
            `Jurnal ${idJurnal} berhasil dibuat, tetapi id_jurnal ` +
            `gagal disimpan pada pendapatan proyek: ${
              updateError?.message ?? "Data pendapatan tidak ditemukan."
            }`,
          id_pendapatan: insertedPendapatanId,
          id_jurnal: idJurnal,
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       SUCCESS
    ======================================================== */

    return NextResponse.json(
      {
        message: "Pendapatan proyek berhasil disimpan dan diposting ke jurnal.",
        data: {
          ...result,
          proyek,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Data pendapatan proyek tidak valid.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
