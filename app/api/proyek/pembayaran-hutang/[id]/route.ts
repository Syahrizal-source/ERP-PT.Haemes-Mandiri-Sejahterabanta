import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import { proyekPembayaranHutangSchema } from "@/lib/validators/proyekPembayaranHutang";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type PembayaranHutangRow = {
  id: string;
  id_hutang: string;
  tanggal: string;
  jumlah: number | string;
  metode: string | null;
  bank: string | null;
};

type HutangRow = {
  id: string;
  nilai: number | string;
  jumlah_pembayaran: number | string;
  sisa: number | string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

/* ============================================================
   GET DETAIL PEMBAYARAN HUTANG
   ============================================================ */

export async function GET(
  _req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    if (!id || id.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "ID pembayaran hutang tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const { data, error } = await db
      .from("proyek_pembayaran_hutang")
      .select(
        `
        id,
        id_hutang,
        tanggal,
        jumlah,
        metode,
        bank,
        proyek_hutang (
          id,
          id_proyek,
          nilai,
          jumlah_pembayaran,
          sisa,
          status,
          tanggal_pembayaran
        )
        `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("GET DETAIL PEMBAYARAN HUTANG ERROR:", error.message);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Pembayaran hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("GET DETAIL PEMBAYARAN HUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* ============================================================
   UPDATE PEMBAYARAN HUTANG
   ============================================================ */

export async function PUT(
  req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    /* ========================================================
       AMBIL PEMBAYARAN
       ======================================================== */

    const { data: existing, error: existingError } = await db
      .from("proyek_pembayaran_hutang")
      .select(
        `
        id,
        id_hutang,
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
          success: false,
          error: "Pembayaran hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    const pembayaran = existing as PembayaranHutangRow;

    /* ========================================================
       CEK JURNAL POSTING

       Nomor bukti pembayaran mengikuti:
       BHT-{id pembayaran}
       ======================================================== */

    const noBukti = `BHT-${pembayaran.id}`;

    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .select("id_jurnal, no_bukti")
      .eq("no_bukti", noBukti)
      .maybeSingle();

    if (jurnalError) {
      throw new Error(
        `Gagal memeriksa jurnal pembayaran: ${jurnalError.message}`,
      );
    }

    if (jurnal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pembayaran hutang sudah diposting ke jurnal dan tidak dapat diedit. Gunakan proses koreksi/reversal accounting.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       VALIDASI INPUT
       ======================================================== */

    const payload = proyekPembayaranHutangSchema.parse(await req.json());

    if (payload.id_hutang !== pembayaran.id_hutang) {
      return NextResponse.json(
        {
          success: false,
          error: "Pembayaran tidak boleh dipindahkan ke hutang lain.",
        },
        {
          status: 400,
        },
      );
    }

    const jumlah = Number(payload.jumlah);

    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      throw new Error("Jumlah pembayaran harus lebih besar dari 0.");
    }

    /* ========================================================
       VALIDASI BANK
       ======================================================== */

    if (payload.metode === "BANK" && !payload.bank?.trim()) {
      throw new Error("Bank wajib diisi untuk pembayaran melalui BANK.");
    }

    /* ========================================================
       AMBIL HUTANG
       ======================================================== */

    const { data: hutang, error: hutangError } = await db
      .from("proyek_hutang")
      .select(
        `
        id,
        nilai,
        jumlah_pembayaran,
        sisa
        `,
      )
      .eq("id", pembayaran.id_hutang)
      .single();

    if (hutangError || !hutang) {
      throw new Error("Hutang proyek tidak ditemukan.");
    }

    const hutangData = hutang as HutangRow;

    const nilaiHutang = Number(hutangData.nilai);
    const totalPembayaranSaatIni = Number(hutangData.jumlah_pembayaran ?? 0);

    /*
     * Karena pembayaran lama akan diganti,
     * saldo sebelum pembayaran ini harus dikembalikan.
     */
    const sisaSebelumPembayaranIni =
      Number(hutangData.sisa ?? 0) + Number(pembayaran.jumlah);

    if (sisaSebelumPembayaranIni < 0) {
      throw new Error("Saldo hutang tidak valid.");
    }

    if (jumlah > sisaSebelumPembayaranIni) {
      throw new Error(
        `Pembayaran melebihi saldo hutang. Sisa yang tersedia Rp${sisaSebelumPembayaranIni.toLocaleString(
          "id-ID",
        )}.`,
      );
    }

    /* ========================================================
       UPDATE PEMBAYARAN
       ======================================================== */

    const { error: updatePaymentError } = await db
      .from("proyek_pembayaran_hutang")
      .update({
        tanggal: payload.tanggal,
        jumlah,
        metode: payload.metode,
        bank: payload.bank?.trim() || null,
      })
      .eq("id", id);

    if (updatePaymentError) {
      throw new Error(
        `Gagal mengupdate pembayaran: ${updatePaymentError.message}`,
      );
    }

    /* ========================================================
       HITUNG ULANG SELURUH PEMBAYARAN
       ======================================================== */

    const { data: payments, error: paymentsError } = await db
      .from("proyek_pembayaran_hutang")
      .select("jumlah")
      .eq("id_hutang", pembayaran.id_hutang);

    if (paymentsError) {
      throw new Error(
        `Gagal menghitung pembayaran hutang: ${paymentsError.message}`,
      );
    }

    const totalPembayaranBaru =
      payments?.reduce(
        (total: number, item: { jumlah: number | string }) =>
          total + Number(item.jumlah),
        0,
      ) ?? 0;

    const sisaBaru = Math.max(nilaiHutang - totalPembayaranBaru, 0);

    const statusBaru =
      sisaBaru === 0
        ? "Paid (Pembayaran Penuh/ Lunas)"
        : totalPembayaranBaru > 0
          ? "Partial (Pembayaran Sebagian)"
          : "Unpaid (Menunggu Pembayaran)";

    /* ========================================================
       UPDATE HUTANG
       ======================================================== */

    const { error: updateHutangError } = await db
      .from("proyek_hutang")
      .update({
        jumlah_pembayaran: totalPembayaranBaru,
        sisa: sisaBaru,
        status: statusBaru,
        tanggal_pembayaran: payload.tanggal,
      })
      .eq("id", pembayaran.id_hutang);

    if (updateHutangError) {
      throw new Error(
        `Pembayaran berhasil diubah tetapi saldo hutang gagal diperbarui: ${updateHutangError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran hutang proyek berhasil diupdate.",
      data: {
        id,
        id_hutang: pembayaran.id_hutang,
        tanggal: payload.tanggal,
        jumlah,
        metode: payload.metode,
        bank: payload.bank?.trim() || null,
        nilai_hutang: nilaiHutang,
        jumlah_pembayaran: totalPembayaranBaru,
        sisa: sisaBaru,
        status: statusBaru,
      },
    });
  } catch (error: unknown) {
    console.error("PUT PEMBAYARAN HUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}

/* ============================================================
   DELETE PEMBAYARAN HUTANG
   ============================================================ */

export async function DELETE(
  _: NextRequest,
  context: Context,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    /* ========================================================
       CEK PEMBAYARAN
       ======================================================== */

    const { data: existing, error: existingError } = await db
      .from("proyek_pembayaran_hutang")
      .select(
        `
        id,
        id_hutang,
        jumlah,
        tanggal
        `,
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Pembayaran hutang proyek tidak ditemukan.",
        },
        {
          status: 404,
        },
      );
    }

    const pembayaran = existing as {
      id: string;
      id_hutang: string;
      jumlah: number | string;
      tanggal: string;
    };

    /* ========================================================
       CEK JURNAL

       Pembayaran POST otomatis membuat:
       BHT-{id pembayaran}
       ======================================================== */

    const noBukti = `BHT-${pembayaran.id}`;

    const { data: jurnal, error: jurnalError } = await db
      .from("jurnal")
      .select("id_jurnal, no_bukti")
      .eq("no_bukti", noBukti)
      .maybeSingle();

    if (jurnalError) {
      throw new Error(
        `Gagal memeriksa jurnal pembayaran: ${jurnalError.message}`,
      );
    }

    /* ========================================================
       PEMBAYARAN SUDAH POSTED
       ======================================================== */

    if (jurnal) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Pembayaran hutang sudah diposting ke jurnal dan tidak boleh dihapus. Gunakan proses koreksi/reversal accounting.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       AMBIL HUTANG
       ======================================================== */

    const { data: hutang, error: hutangError } = await db
      .from("proyek_hutang")
      .select(
        `
        id,
        nilai,
        jumlah_pembayaran
        `,
      )
      .eq("id", pembayaran.id_hutang)
      .single();

    if (hutangError || !hutang) {
      throw new Error("Hutang proyek tidak ditemukan.");
    }

    const nilaiHutang = Number(hutang.nilai);

    /* ========================================================
       DELETE PEMBAYARAN
       ======================================================== */

    const { error: deleteError } = await db
      .from("proyek_pembayaran_hutang")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(`Gagal menghapus pembayaran: ${deleteError.message}`);
    }

    /* ========================================================
       HITUNG ULANG PEMBAYARAN
       ======================================================== */

    const { data: payments, error: paymentsError } = await db
      .from("proyek_pembayaran_hutang")
      .select("jumlah")
      .eq("id_hutang", pembayaran.id_hutang);

    if (paymentsError) {
      throw new Error(
        `Gagal menghitung ulang pembayaran: ${paymentsError.message}`,
      );
    }

    const totalPembayaran =
      payments?.reduce(
        (total: number, item: { jumlah: number | string }) =>
          total + Number(item.jumlah),
        0,
      ) ?? 0;

    const sisa = Math.max(nilaiHutang - totalPembayaran, 0);

    const status =
      sisa === 0
        ? "Paid (Pembayaran Penuh/ Lunas)"
        : totalPembayaran > 0
          ? "Partial (Pembayaran Sebagian)"
          : "Unpaid (Menunggu Pembayaran)";

    /* ========================================================
       UPDATE HUTANG
       ======================================================== */

    const { error: updateHutangError } = await db
      .from("proyek_hutang")
      .update({
        jumlah_pembayaran: totalPembayaran,
        sisa,
        status,
        tanggal_pembayaran: null,
      })
      .eq("id", pembayaran.id_hutang);

    if (updateHutangError) {
      throw new Error(
        `Pembayaran terhapus tetapi saldo hutang gagal diperbarui: ${updateHutangError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran hutang proyek berhasil dihapus.",
      data: {
        id_hutang: pembayaran.id_hutang,
        nilai_hutang: nilaiHutang,
        jumlah_pembayaran: totalPembayaran,
        sisa,
        status,
      },
    });
  } catch (error: unknown) {
    console.error("DELETE PEMBAYARAN HUTANG PROYEK ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      {
        status: 400,
      },
    );
  }
}
