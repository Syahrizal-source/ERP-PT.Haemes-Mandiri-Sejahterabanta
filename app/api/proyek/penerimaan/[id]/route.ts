import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  ProyekPenerimaanSchema,
  type ProyekPenerimaanInput,
} from "@/lib/validators/penerimaanproyek";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type StatusPiutang =
  | "Unpaid (Menunggu Pembayaran)"
  | "Partial (Pembayaran Sebagian)"
  | "Paid (Pembayaran Penuh/ Lunas)";

// =====================================================
// PUT UPDATE PENERIMAAN
// =====================================================

export async function PUT(
  req: NextRequest,
  context: Context,
): Promise<Response> {
  try {
    const { id } = await context.params;

    // =================================================
    // VALIDASI REQUEST
    // =================================================

    const body: unknown = await req.json();

    const payload: ProyekPenerimaanInput = ProyekPenerimaanSchema.parse(body);

    // =================================================
    // VALIDASI JUMLAH
    // =================================================

    const jumlahBaru = Number(payload.jumlah);

    if (!Number.isFinite(jumlahBaru) || jumlahBaru <= 0) {
      return NextResponse.json(
        {
          error: "Jumlah penerimaan harus lebih besar dari 0.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // VALIDASI METODE
    // =================================================

    if (payload.metode !== "KAS" && payload.metode !== "BANK") {
      return NextResponse.json(
        {
          error: "Metode penerimaan hanya KAS atau BANK.",
        },
        {
          status: 400,
        },
      );
    }

    if (payload.metode === "BANK" && !payload.bank?.trim()) {
      return NextResponse.json(
        {
          error: "Bank wajib diisi untuk metode BANK.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // AMBIL PENERIMAAN LAMA
    // =================================================

    const { data: existing, error: existingError } = await db
      .from("proyek_penerimaan")
      .select(
        `
          id,
          id_tagihan,
          tanggal,
          jumlah,
          metode,
          bank
        `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          error: "Data penerimaan tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // PENERIMAAN TIDAK BOLEH PINDAH TAGIHAN
    // =================================================

    if (existing.id_tagihan !== payload.id_tagihan) {
      return NextResponse.json(
        {
          error: "Penerimaan tidak boleh dipindahkan ke tagihan lain.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // AMBIL PIUTANG
    // =================================================

    const { data: piutang, error: piutangError } = await db
      .from("piutang_proyek")
      .select(
        `
          id_piutang_proyek,
          id_tagihan,
          nilai_piutang
        `,
      )
      .eq("id_tagihan", existing.id_tagihan)
      .single();

    if (piutangError || !piutang) {
      return NextResponse.json(
        {
          error: "Piutang proyek untuk tagihan tersebut tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // NILAI PIUTANG
    // =================================================

    const nilaiPiutang = Number(piutang.nilai_piutang);

    if (!Number.isFinite(nilaiPiutang) || nilaiPiutang <= 0) {
      return NextResponse.json(
        {
          error: "Nilai piutang tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // AMBIL SEMUA PENERIMAAN TAGIHAN
    // =================================================

    const { data: penerimaanList, error: penerimaanListError } = await db
      .from("proyek_penerimaan")
      .select(
        `
          id,
          tanggal,
          jumlah
        `,
      )
      .eq("id_tagihan", existing.id_tagihan);

    if (penerimaanListError) {
      return NextResponse.json(
        {
          error: penerimaanListError.message,
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // HITUNG ULANG TOTAL
    // =================================================

    const totalPenerimaanSelainCurrent = (penerimaanList ?? []).reduce(
      (sum, item) => {
        if (item.id === id) {
          return sum;
        }

        return sum + Number(item.jumlah);
      },
      0,
    );

    const penerimaanBaru = totalPenerimaanSelainCurrent + jumlahBaru;

    // =================================================
    // ANTI MINUS
    // =================================================

    if (penerimaanBaru > nilaiPiutang) {
      return NextResponse.json(
        {
          error: "Total penerimaan tidak boleh melebihi nilai piutang.",
        },
        {
          status: 400,
        },
      );
    }

    const saldoBaru = nilaiPiutang - penerimaanBaru;

    if (saldoBaru < 0) {
      return NextResponse.json(
        {
          error: "Saldo piutang tidak boleh minus.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // STATUS OTOMATIS
    // =================================================

    let status: StatusPiutang;

    if (saldoBaru === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (penerimaanBaru > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    // =================================================
    // UPDATE DETAIL PENERIMAAN
    // =================================================

    const { data: updated, error: updateError } = await db
      .from("proyek_penerimaan")
      .update({
        tanggal: payload.tanggal,
        jumlah: jumlahBaru,
        metode: payload.metode,
        bank: payload.metode === "BANK" ? (payload.bank?.trim() ?? null) : null,
      })
      .eq("id", id)
      .select(
        `
          id,
          id_tagihan,
          tanggal,
          jumlah,
          metode,
          bank
        `,
      )
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        {
          error: updateError?.message ?? "Gagal mengupdate penerimaan.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // CARI TANGGAL PEMBAYARAN TERAKHIR
    // =================================================

    const { data: penerimaanTerbaru, error: tanggalError } = await db
      .from("proyek_penerimaan")
      .select("tanggal")
      .eq("id_tagihan", existing.id_tagihan)
      .order("tanggal", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (tanggalError) {
      return NextResponse.json(
        {
          error:
            "Penerimaan berhasil diupdate tetapi tanggal pembayaran gagal dihitung.",
        },
        {
          status: 500,
        },
      );
    }

    // =================================================
    // UPDATE PIUTANG
    // =================================================

    const { error: piutangUpdateError } = await db
      .from("piutang_proyek")
      .update({
        penerimaan: penerimaanBaru,
        tanggal_pembayaran:
          penerimaanBaru > 0
            ? (penerimaanTerbaru?.tanggal ?? payload.tanggal)
            : null,
        status,
      })
      .eq("id_piutang_proyek", piutang.id_piutang_proyek);

    if (piutangUpdateError) {
      return NextResponse.json(
        {
          error:
            "Penerimaan berhasil diupdate tetapi piutang gagal disinkronkan.",
        },
        {
          status: 500,
        },
      );
    }

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      message: "Penerimaan dan piutang berhasil diperbarui.",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("PUT PENERIMAAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengupdate penerimaan.",
      },
      {
        status: 400,
      },
    );
  }
}

// =====================================================
// DELETE PENERIMAAN
// =====================================================

export async function DELETE(
  _req: NextRequest,
  context: Context,
): Promise<Response> {
  try {
    const { id } = await context.params;

    // =================================================
    // AMBIL PENERIMAAN
    // =================================================

    const { data: penerimaan, error: penerimaanError } = await db
      .from("proyek_penerimaan")
      .select(
        `
          id,
          id_tagihan,
          tanggal,
          jumlah
        `,
      )
      .eq("id", id)
      .single();

    if (penerimaanError || !penerimaan) {
      return NextResponse.json(
        {
          error: "Data penerimaan tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // AMBIL PIUTANG
    // =================================================

    const { data: piutang, error: piutangError } = await db
      .from("piutang_proyek")
      .select(
        `
          id_piutang_proyek,
          nilai_piutang
        `,
      )
      .eq("id_tagihan", penerimaan.id_tagihan)
      .single();

    if (piutangError || !piutang) {
      return NextResponse.json(
        {
          error: "Piutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // HITUNG ULANG DARI DATABASE
    // =================================================

    const { data: penerimaanList, error: listError } = await db
      .from("proyek_penerimaan")
      .select(
        `
          id,
          tanggal,
          jumlah
        `,
      )
      .eq("id_tagihan", penerimaan.id_tagihan);

    if (listError) {
      return NextResponse.json(
        {
          error: listError.message,
        },
        {
          status: 400,
        },
      );
    }

    const penerimaanSetelahHapus = (penerimaanList ?? []).reduce(
      (sum, item) => {
        if (item.id === id) {
          return sum;
        }

        return sum + Number(item.jumlah);
      },
      0,
    );

    const nilaiPiutang = Number(piutang.nilai_piutang);

    const saldoBaru = nilaiPiutang - penerimaanSetelahHapus;

    if (saldoBaru < 0) {
      return NextResponse.json(
        {
          error: "Saldo piutang menjadi minus.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // STATUS OTOMATIS
    // =================================================

    let status: StatusPiutang;

    if (saldoBaru === 0) {
      status = "Paid (Pembayaran Penuh/ Lunas)";
    } else if (penerimaanSetelahHapus > 0) {
      status = "Partial (Pembayaran Sebagian)";
    } else {
      status = "Unpaid (Menunggu Pembayaran)";
    }

    // =================================================
    // HAPUS PENERIMAAN
    // =================================================

    const { error: deleteError } = await db
      .from("proyek_penerimaan")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        {
          error: deleteError.message,
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // CARI TANGGAL PENERIMAAN TERAKHIR
    // =================================================

    const { data: penerimaanTerakhir, error: tanggalError } = await db
      .from("proyek_penerimaan")
      .select("tanggal")
      .eq("id_tagihan", penerimaan.id_tagihan)
      .order("tanggal", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (tanggalError) {
      return NextResponse.json(
        {
          error:
            "Penerimaan berhasil dihapus tetapi tanggal pembayaran gagal dihitung.",
        },
        {
          status: 500,
        },
      );
    }

    // =================================================
    // UPDATE PIUTANG
    // =================================================

    const { error: piutangUpdateError } = await db
      .from("piutang_proyek")
      .update({
        penerimaan: penerimaanSetelahHapus,
        tanggal_pembayaran:
          penerimaanSetelahHapus > 0
            ? (penerimaanTerakhir?.tanggal ?? null)
            : null,
        status,
      })
      .eq("id_piutang_proyek", piutang.id_piutang_proyek);

    if (piutangUpdateError) {
      return NextResponse.json(
        {
          error: "Penerimaan terhapus tetapi piutang gagal disinkronkan.",
        },
        {
          status: 500,
        },
      );
    }
    //
    // Jurnal tagihan seperti #611 adalah jurnal
    // pembentukan piutang dan TIDAK boleh dihapus
    // ketika penerimaan dihapus.
    //
    // =================================================

    return NextResponse.json({
      message: "Penerimaan berhasil dihapus dan piutang telah disinkronkan.",
    });
  } catch (error: unknown) {
    console.error("DELETE PENERIMAAN PROYEK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus penerimaan.",
      },
      {
        status: 500,
      },
    );
  }
}
