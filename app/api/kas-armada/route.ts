import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import {
  kasArmadaSchema,
  normalizeKasArmada,
  hitungKasArmada,
  validateKasArmada,
} from "@/lib/validators/kas-armada";

import { postKasArmada } from "@/lib/accounting/postKasArmada";

/**
 * ============================================================
 * TYPE DATABASE
 * ============================================================
 */

type KasArmadaRow = {
  id: number;
  tanggal: string;
  sopir: string;
  penerimaan: number;
  pengembalian: number;
  pengeluaran: number;
  kasbon: number;
  total_masuk: number;
  total_keluar: number;
  saldo: number;
  status: string;
};

/**
 * ============================================================
 * GET
 * ============================================================
 *
 * Mengambil seluruh transaksi Kas Armada.
 *
 * COA tidak dikirim dari frontend karena penentuan COA
 * dilakukan oleh accounting/postKasArmada.ts berdasarkan
 * mapping dan sopir.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("kas_armada")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json((data ?? []) as KasArmadaRow[]);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data Kas Armada.";

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

/**
 * ============================================================
 * POST
 * ============================================================
 *
 * Flow:
 *
 *   Request
 *      ↓
 *   Schema validation
 *      ↓
 *   Normalize
 *      ↓
 *   Business validation
 *      ↓
 *   Hitung saldo
 *      ↓
 *   INSERT kas_armada DRAFT
 *      ↓
 *   postKasArmada()
 *      ↓
 *   Jika berhasil -> POSTED
 *
 * Accounting COA:
 *
 *   Kas sumber:
 *     KAS_ARMADA / KAS_ARMADA_BU_BUTET
 *     -> 1101.03.04 Kas Kecil Bu Butet
 *
 *   Kas sopir:
 *     dicari berdasarkan:
 *     Kas Armada Supir - [sopir]
 *
 *   Beban:
 *     KAS_ARMADA / BEBAN
 *     -> 61101 Beban Armada
 *
 * Pendapatan Armada 41101 tidak digunakan.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    /* ========================================================
       1. BACA BODY SEKALI SAJA
       ======================================================== */

    const raw: unknown = await req.json();

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return NextResponse.json(
        {
          error: "Body tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const dataRaw = raw as Record<string, unknown>;

    /* ========================================================
       2. NORMALIZE INPUT
       ======================================================== */

    const body = {
      tanggal: String(dataRaw.tanggal ?? ""),
      sopir: String(dataRaw.sopir ?? ""),
      penerimaan: Number(dataRaw.penerimaan ?? 0),
      pengembalian: Number(dataRaw.pengembalian ?? 0),
      pengeluaran: Number(dataRaw.pengeluaran ?? 0),
      kasbon: Number(dataRaw.kasbon ?? 0),
    };

    /* ========================================================
       3. VALIDASI SCHEMA
       ======================================================== */

    const parsed = kasArmadaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Data Kas Armada tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const input = parsed.data;

    /* ========================================================
       4. NORMALIZE + BUSINESS VALIDATION
       ======================================================== */

    const dataNorm = normalizeKasArmada(input);

    validateKasArmada(dataNorm);

    /* ========================================================
       5. VALIDASI NILAI ANGKA
       ======================================================== */

    const angka = [
      dataNorm.penerimaan,
      dataNorm.pengembalian,
      dataNorm.pengeluaran,
      dataNorm.kasbon,
    ];

    for (const nilai of angka) {
      if (!Number.isFinite(nilai)) {
        return NextResponse.json(
          {
            error: "Nilai transaksi Kas Armada harus berupa angka yang valid.",
          },
          {
            status: 400,
          },
        );
      }

      if (nilai < 0) {
        return NextResponse.json(
          {
            error: "Nilai transaksi Kas Armada tidak boleh negatif.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* ========================================================
       6. VALIDASI SOPIR
       ======================================================== */

    if (!dataNorm.sopir.trim()) {
      return NextResponse.json(
        {
          error: "Sopir wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       7. HITUNG
       ======================================================== */

    const hitung = hitungKasArmada(dataNorm);

    if (!Number.isFinite(hitung.saldo)) {
      return NextResponse.json(
        {
          error: "Saldo Kas Armada tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (hitung.saldo < 0) {
      return NextResponse.json(
        {
          error: "Saldo Kas Armada tidak boleh negatif.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       8. VALIDASI ADA TRANSAKSI
       ======================================================== */

    const adaTransaksi =
      dataNorm.penerimaan > 0 ||
      dataNorm.pengembalian > 0 ||
      dataNorm.pengeluaran > 0 ||
      dataNorm.kasbon > 0;

    if (!adaTransaksi) {
      return NextResponse.json(
        {
          error: "Tidak ada transaksi Kas Armada.",
        },
        {
          status: 400,
        },
      );
    }

    /* ========================================================
       9. INSERT KAS ARMADA SEBAGAI DRAFT
       ======================================================== */

    const { data, error } = await db
      .from("kas_armada")
      .insert({
        tanggal: dataNorm.tanggal,
        sopir: dataNorm.sopir,
        penerimaan: dataNorm.penerimaan,
        pengembalian: dataNorm.pengembalian,
        pengeluaran: dataNorm.pengeluaran,
        kasbon: dataNorm.kasbon,
        saldo: hitung.saldo,
        status: "DRAFT",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("KAS ARMADA INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: error?.message ?? "Gagal menyimpan transaksi Kas Armada.",
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       10. POST JURNAL
       ======================================================== */

    try {
      await postKasArmada(dataNorm);
    } catch (error: unknown) {
      console.error("KAS ARMADA JOURNAL ERROR:", error);

      /**
       * Transaksi database tetap disimpan sebagai DRAFT.
       *
       * Jangan mengubah menjadi POSTED jika jurnal gagal.
       */
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Gagal melakukan posting jurnal Kas Armada.",
          data: {
            id: data.id,
            status: "DRAFT",
          },
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       11. UPDATE STATUS POSTED
       ======================================================== */

    const { data: postedData, error: postedError } = await db
      .from("kas_armada")
      .update({
        status: "POSTED",
      })
      .eq("id", data.id)
      .eq("status", "DRAFT")
      .select()
      .single();

    if (postedError || !postedData) {
      console.error("KAS ARMADA STATUS UPDATE ERROR:", postedError);

      /**
       * Jurnal sudah berhasil dibuat, tetapi status
       * transaksi gagal diubah.
       *
       * Jangan membuat jurnal kedua.
       */
      return NextResponse.json(
        {
          error:
            postedError?.message ??
            "Jurnal berhasil diposting, tetapi status transaksi gagal diperbarui.",
          data: {
            id: data.id,
            status: "DRAFT",
          },
        },
        {
          status: 500,
        },
      );
    }

    /* ========================================================
       12. RESPONSE
       ======================================================== */

    return NextResponse.json(
      {
        message: "Kas Armada berhasil diposting.",
        data: postedData,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    console.error("KAS ARMADA POST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada transaksi Kas Armada.",
      },
      {
        status: 500,
      },
    );
  }
}
