import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";
import { postJournal } from "@/lib/accounting/postJournal";

import type { JurnalLine } from "@/types/accounting";

type FuelInput = {
  equipment_id: string;
  tanggal: string;
  liter: number;
  harga: number;
  supplier: string | null;
};

type FuelRow = {
  id: string;
  equipment_id: string;
  tanggal: string;
  liter: number;
  harga: number;
  total: number;
  supplier: string | null;
  id_jurnal: number | null;
};

export async function GET() {
  const { data, error } = await db
    .from("equipment_fuel")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: FuelRow[] = data ?? [];

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body: FuelInput = await req.json();

    if (!body.equipment_id) {
      return NextResponse.json(
        { error: "Equipment wajib dipilih." },
        { status: 400 },
      );
    }

    if (!body.tanggal) {
      return NextResponse.json(
        { error: "Tanggal fuel wajib diisi." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(body.liter) || body.liter <= 0) {
      return NextResponse.json(
        { error: "Jumlah liter harus lebih dari 0." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(body.harga) || body.harga <= 0) {
      return NextResponse.json(
        { error: "Harga BBM harus lebih dari 0." },
        { status: 400 },
      );
    }

    const total: number = body.liter * body.harga;

    const { data: fuelInsert, error: fuelError } = await db
      .from("equipment_fuel")
      .insert({
        equipment_id: body.equipment_id,
        tanggal: body.tanggal,
        liter: body.liter,
        harga: body.harga,
        supplier: body.supplier,
      })
      .select()
      .single();

    if (fuelError || !fuelInsert) {
      return NextResponse.json(
        {
          error: fuelError?.message ?? "Gagal menyimpan data fuel alat berat.",
        },
        { status: 500 },
      );
    }

    const fuel: FuelRow = fuelInsert;

    /*
     * COA Fuel Alat Berat
     *
     * DEBIT  : 51001 - Biaya BBM Alat Berat
     * KREDIT : 11120 - Kas Alat Berat
     *
     * Kedua COA harus aktif dan merupakan COA detail/leaf.
     */

    const { data: coaBeban, error: coaBebanError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", "51001")
      .eq("aktif", true)
      .eq("is_header", false)
      .single();

    if (coaBebanError || !coaBeban) {
      return NextResponse.json(
        {
          error:
            coaBebanError?.message ??
            "COA 51001 - Biaya BBM Alat Berat tidak ditemukan atau tidak aktif.",
        },
        { status: 400 },
      );
    }

    const { data: coaKas, error: coaKasError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", "11120")
      .eq("aktif", true)
      .eq("is_cash", true)
      .eq("is_header", false)
      .single();

    if (coaKasError || !coaKas) {
      return NextResponse.json(
        {
          error:
            coaKasError?.message ??
            "COA 11120 - Kas Alat Berat tidak ditemukan atau tidak aktif.",
        },
        { status: 400 },
      );
    }

    const lines: JurnalLine[] = [
      {
        id_coa: coaBeban.id_coa,
        debit: total,
        kredit: 0,
        id_alat: body.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: total,
        id_alat: body.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
    ];

    const jurnalId: number = await postJournal({
      tanggal: body.tanggal,
      no_bukti: `FUEL-${fuel.id}`,
      keterangan: "Fuel Alat Berat",
      sumber: "ALAT_BERAT",
      modul: "ALAT_BERAT",
      ref_id: fuel.id,
      lines,
    });

    const { error: updateError } = await db
      .from("equipment_fuel")
      .update({ id_jurnal: jurnalId })
      .eq("id", fuel.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
          data: fuel,
          jurnal_id: jurnalId,
        },
        { status: 500 },
      );
    }

    const finalFuel: FuelRow = {
      ...fuel,
      id_jurnal: jurnalId,
    };

    return NextResponse.json({
      message: "Fuel alat berat berhasil dibuat",
      data: finalFuel,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses fuel alat berat.",
      },
      { status: 500 },
    );
  }
}
