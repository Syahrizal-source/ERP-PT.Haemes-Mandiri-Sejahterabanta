import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import type { JurnalLine } from "@/types/accounting";

import { postJurnalUmum } from "@/lib/accounting/postJurnalUmum";

/* =========================
   TYPES
========================= */

interface RequestBody {
  id_periode: number;
  tanggal: string;
}

interface SaldoRow {
  id_coa: number;
  total_debit: number;
  total_kredit: number;
}

/* =========================
   POST JURNAL PENUTUP
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const { id_periode, tanggal } =
      body as RequestBody; /* =========================
       VALIDASI
    ========================= */

    if (!id_periode || !tanggal) {
      return NextResponse.json(
        {
          error: "Periode dan tanggal wajib diisi",
        },
        { status: 400 },
      );
    } /* =========================
       CEK PERIODE
    ========================= */

    const { data: periode, error: periodeError } = await db
      .from("periode")
      .select("id_periode,status")
      .eq("id_periode", id_periode)
      .single();

    if (periodeError || !periode) {
      return NextResponse.json(
        {
          error: "Periode tidak ditemukan",
        },
        { status: 404 },
      );
    }

    if (periode.status !== "OPEN") {
      return NextResponse.json(
        {
          error: "Periode sudah CLOSED",
        },
        { status: 400 },
      );
    } /* =========================
       CEK SUDAH CLOSING
    ========================= */

    const { data: existing } = await db
      .from("jurnal_penutup")
      .select("id")
      .eq("id_periode", id_periode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: "Jurnal penutup sudah dibuat",
        },
        { status: 400 },
      );
    } /* =========================
       AMBIL SALDO LABA RUGI
    ========================= */

    const { data: saldoData, error: saldoError } = await db.rpc(
      "get_saldo_labarugi",
      {
        p_id_periode: id_periode,
      },
    );

    if (saldoError) {
      return NextResponse.json(
        {
          error: saldoError.message,
        },
        { status: 500 },
      );
    } /* =========================
       NORMALISASI DATA
    ========================= */

    let totalLabaRugi = 0; /*
      Function sekarang return:
      numeric

      bukan array.
    */

    if (typeof saldoData === "number") {
      totalLabaRugi = Number(saldoData);
    } else if (typeof saldoData === "string") {
      totalLabaRugi = Number(saldoData);
    } else if (saldoData === null) {
      totalLabaRugi = 0;
    } else {
      return NextResponse.json(
        {
          error: "Format saldo laba rugi tidak valid",
        },
        { status: 500 },
      );
    } /* =========================
       TIDAK ADA SALDO
    ========================= */

    if (totalLabaRugi === 0) {
      return NextResponse.json(
        {
          error: "Saldo laba rugi masih nol",
        },
        { status: 400 },
      );
    } /* =========================
       LABA DITAHAN
    ========================= */ /*
      Ambil dari COA mapping
      kategori:
      LABA_DITAHAN

      sementara fallback:
      33001
    */

    let labaDitahanCoa = 33001;

    const { data: coaData } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "33001")
      .maybeSingle();

    if (coaData?.id_coa) {
      labaDitahanCoa = Number(coaData.id_coa);
    } /* =========================
       JURNAL LINE
    ========================= */

    const lines: JurnalLine[] = []; /*
      Jika laba:
      Dr Pendapatan
      Cr Laba Ditahan

      Simplified closing.
    */

    if (totalLabaRugi > 0) {
      lines.push({
        id_coa: labaDitahanCoa,
        debit: 0,
        kredit: totalLabaRugi,
      });

      lines.push({
        id_coa: labaDitahanCoa,
        debit: totalLabaRugi,
        kredit: 0,
      });
    } else {
      const nilai = Math.abs(totalLabaRugi);

      lines.push({
        id_coa: labaDitahanCoa,
        debit: nilai,
        kredit: 0,
      });

      lines.push({
        id_coa: labaDitahanCoa,
        debit: 0,
        kredit: nilai,
      });
    } /* =========================
       VALIDASI BALANCE
    ========================= */

    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);

    const totalKredit = lines.reduce((sum, line) => sum + line.kredit, 0);

    if (totalDebit !== totalKredit) {
      return NextResponse.json(
        {
          error: "Jurnal penutup tidak balance",
        },
        { status: 400 },
      );
    } /* =========================
       POST JURNAL
    ========================= */

    const jurnalId: number = await postJurnalUmum(
      tanggal,
      `CLOSE-${id_periode}`,
      `Jurnal Penutup Periode ${id_periode}`,
      lines,
    ); /* =========================
       SIMPAN LOG
    ========================= */

    const { error: insertError } = await db.from("jurnal_penutup").insert({
      id_periode,
      tanggal,
    });

    if (insertError) {
      return NextResponse.json(
        {
          error: insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      jurnal_id: jurnalId,
      message: "Jurnal penutup berhasil dibuat",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Terjadi kesalahan",
      },
      { status: 500 },
    );
  }
}
