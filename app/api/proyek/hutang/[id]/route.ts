import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type HutangStatus =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

type ProyekHutangRow = {
  id: string;
  id_proyek: string;
  supplier: string | null;
  tanggal: string | null;
  nilai: number;
  jatuh_tempo: string | null;
  status: HutangStatus | null;
  no_bukti: string | null;
  periode: string | null;
  id_jurnal: number | null;
  sumber: string | null;
  id_referensi: string | null;
  jumlah_pembayaran: number;
  sisa: number;
  tanggal_pembayaran: string | null;
  keterangan: string | null;
};

/* ============================================================
   GET DETAIL HUTANG
============================================================ */

export async function GET(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const { data, error } = await db
      .from("proyek_hutang")
      .select(
        `
        id,
        id_proyek,
        supplier,
        tanggal,
        nilai,
        jatuh_tempo,
        status,
        no_bukti,
        periode,
        id_jurnal,
        sumber,
        id_referensi,
        jumlah_pembayaran,
        sisa,
        tanggal_pembayaran,
        keterangan
        `,
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: "Hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    const result: ProyekHutangRow = {
      ...data,
      nilai: Number(data.nilai),
      jumlah_pembayaran: Number(data.jumlah_pembayaran ?? 0),
      sisa: Number(data.sisa ?? data.nilai),
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GET DETAIL PROYEK HUTANG ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail hutang proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   PUT UPDATE HUTANG
============================================================ */

export async function PUT(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        {
          error: "Payload update tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const input = body as Record<string, unknown>;

    /* ========================================================
       AMBIL DATA LAMA
    ======================================================== */

    const { data: existing, error: existingError } = await db
      .from("proyek_hutang")
      .select(
        `
          id,
          id_proyek,
          supplier,
          tanggal,
          nilai,
          jatuh_tempo,
          status,
          no_bukti,
          periode,
          id_jurnal,
          sumber,
          id_referensi,
          jumlah_pembayaran,
          sisa,
          tanggal_pembayaran,
          keterangan
          `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       TRANSAKSI YANG SUDAH POSTED
       
       Tidak boleh mengubah nilai accounting melalui PUT biasa.
       ======================================================== */

    const idJurnal =
      existing.id_jurnal === null ? null : Number(existing.id_jurnal);

    const isPosted = idJurnal !== null;

    /* ========================================================
       FIELD ACCOUNTING YANG DILARANG DIUBAH
       ======================================================== */

    const protectedFields = [
      "id",
      "id_proyek",
      "nilai",
      "no_bukti",
      "id_jurnal",
      "sumber",
      "id_referensi",
      "jumlah_pembayaran",
      "sisa",
      "tanggal_pembayaran",
    ] as const;

    for (const field of protectedFields) {
      if (field in input) {
        return NextResponse.json(
          {
            error: `Field ${field} tidak boleh diubah melalui endpoint update hutang.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    /* ========================================================
       FIELD YANG BOLEH DIUPDATE
       ======================================================== */

    const updateData: {
      supplier?: string;
      tanggal?: string;
      jatuh_tempo?: string | null;
      periode?: string | null;
      keterangan?: string | null;
      updated_at?: string;
    } = {};

    /* ========================================================
       SUPPLIER
       ======================================================== */

    if ("supplier" in input) {
      if (
        typeof input.supplier !== "string" ||
        input.supplier.trim().length === 0
      ) {
        return NextResponse.json(
          {
            error: "Supplier wajib diisi.",
          },
          {
            status: 400,
          },
        );
      }

      if (input.supplier.trim().length > 255) {
        return NextResponse.json(
          {
            error: "Supplier maksimal 255 karakter.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.supplier = input.supplier.trim();
    }

    /* ========================================================
       TANGGAL
       ======================================================== */

    if ("tanggal" in input) {
      if (
        typeof input.tanggal !== "string" ||
        input.tanggal.trim().length === 0
      ) {
        return NextResponse.json(
          {
            error: "Tanggal hutang tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.tanggal = input.tanggal;
    }

    /* ========================================================
       JATUH TEMPO
       ======================================================== */

    if ("jatuh_tempo" in input) {
      if (input.jatuh_tempo !== null && typeof input.jatuh_tempo !== "string") {
        return NextResponse.json(
          {
            error: "Jatuh tempo tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.jatuh_tempo =
        input.jatuh_tempo === null ? null : input.jatuh_tempo;
    }

    /* ========================================================
       VALIDASI TANGGAL
       ======================================================== */

    const tanggalFinal = updateData.tanggal ?? existing.tanggal;

    const jatuhTempoFinal =
      updateData.jatuh_tempo !== undefined
        ? updateData.jatuh_tempo
        : existing.jatuh_tempo;

    if (tanggalFinal && jatuhTempoFinal && jatuhTempoFinal < tanggalFinal) {
      return NextResponse.json(
        {
          error: "Jatuh tempo tidak boleh lebih kecil dari tanggal hutang.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       PERIODE
       ======================================================== */

    if ("periode" in input) {
      if (input.periode !== null && typeof input.periode !== "string") {
        return NextResponse.json(
          {
            error: "Periode tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        typeof input.periode === "string" &&
        input.periode.trim().length > 50
      ) {
        return NextResponse.json(
          {
            error: "Periode maksimal 50 karakter.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.periode = input.periode === null ? null : input.periode.trim();
    }

    /* ========================================================
       KETERANGAN
       ======================================================== */

    if ("keterangan" in input) {
      if (input.keterangan !== null && typeof input.keterangan !== "string") {
        return NextResponse.json(
          {
            error: "Keterangan tidak valid.",
          },
          {
            status: 400,
          },
        );
      }

      updateData.keterangan =
        input.keterangan === null ? null : input.keterangan.trim();
    }

    /* ========================================================
       TIDAK ADA FIELD YANG BOLEH DIUPDATE
       ======================================================== */

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada data yang dapat diperbarui.",
        },
        {
          status: 400,
        },
      );
    }

    updateData.updated_at = new Date().toISOString();

    /* ========================================================
       UPDATE
       
       id_jurnal TIDAK disentuh.
       COA TIDAK disentuh.
       Nilai hutang TIDAK disentuh.
       ======================================================== */

    const { data: updated, error: updateError } = await db
      .from("proyek_hutang")
      .update(updateData)
      .eq("id", id)
      .select(
        `
          id,
          id_proyek,
          supplier,
          tanggal,
          nilai,
          jatuh_tempo,
          status,
          no_bukti,
          periode,
          id_jurnal,
          sumber,
          id_referensi,
          jumlah_pembayaran,
          sisa,
          tanggal_pembayaran,
          keterangan,
          updated_at
          `,
      )
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Hutang gagal diperbarui.");
    }

    return NextResponse.json({
      message: isPosted
        ? "Data hutang berhasil diperbarui tanpa mengubah jurnal."
        : "Hutang berhasil diperbarui.",
      data: {
        ...updated,
        nilai: Number(updated.nilai),
        jumlah_pembayaran: Number(updated.jumlah_pembayaran ?? 0),
        sisa: Number(updated.sisa ?? updated.nilai),
      },
    });
  } catch (error: unknown) {
    console.error("PUT PROYEK HUTANG ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui hutang proyek.",
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   DELETE HUTANG
============================================================ */

export async function DELETE(
  _: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    /* ========================================================
       VALIDASI ID
    ======================================================== */

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID hutang wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       AMBIL DATA HUTANG
    ======================================================== */

    const { data: existing, error: existingError } = await db
      .from("proyek_hutang")
      .select(
        `
          id,
          id_proyek,
          id_kategori,
          supplier,
          tanggal,
          nilai,
          jatuh_tempo,
          status,
          no_bukti,
          periode,
          id_jurnal,
          sumber,
          id_referensi,
          jumlah_pembayaran,
          sisa,
          tanggal_pembayaran,
          keterangan
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("CEK HUTANG DELETE ERROR:", existingError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal memeriksa data hutang proyek.",
          detail: existingError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    /* ========================================================
       CEK JURNAL
       
       Jika id_jurnal sudah ada, transaksi sudah
       masuk accounting dan TIDAK BOLEH dihapus.
    ======================================================== */

    if (existing.id_jurnal !== null) {
      return NextResponse.json(
        {
          success: false,
          error: "Hutang sudah diposting ke jurnal dan tidak boleh dihapus.",
          detail: "Gunakan proses pembatalan atau koreksi accounting.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       CEK PEMBAYARAN
    ======================================================== */

    const jumlahPembayaran = Number(existing.jumlah_pembayaran ?? 0);

    if (!Number.isFinite(jumlahPembayaran) || jumlahPembayaran < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Data jumlah pembayaran hutang tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (jumlahPembayaran > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Hutang sudah memiliki pembayaran dan tidak boleh dihapus.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       CEK SALDO
       
       Untuk hutang yang belum dibayar:
       sisa harus sama dengan nilai hutang.
    ======================================================== */

    const nilaiHutang = Number(existing.nilai);

    const sisaHutang = Number(existing.sisa ?? existing.nilai);

    if (!Number.isFinite(nilaiHutang) || nilaiHutang <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nilai hutang tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(sisaHutang) || sisaHutang < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Saldo hutang tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (sisaHutang !== nilaiHutang) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hutang tidak dapat dihapus karena saldo hutang sudah berubah.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       DELETE
       
       Sampai titik ini dipastikan:
       
       - Hutang ada
       - Belum memiliki jurnal
       - Belum memiliki pembayaran
       - Saldo masih penuh
       
       Maka aman untuk DELETE.
    ======================================================== */

    const { error: deleteError } = await db
      .from("proyek_hutang")
      .delete()
      .eq("id", id)
      .is("id_jurnal", null);

    if (deleteError) {
      console.error("DELETE HUTANG PROYEK ERROR:", deleteError);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal menghapus hutang proyek.",
          detail: deleteError.message,
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
        success: true,
        message: "Hutang proyek berhasil dihapus.",
        id,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("DELETE PROYEK HUTANG EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus hutang proyek.",
      },
      {
        status: 500,
      },
    );
  }
}
