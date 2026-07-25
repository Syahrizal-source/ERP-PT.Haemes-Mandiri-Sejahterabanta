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
      return NextResponse.json({ error: fuelError?.message }, { status: 500 });
    }

    const fuel: FuelRow = fuelInsert;

    const { data: coaBeban } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "51001")
      .single();

    const { data: coaKas } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "11020")
      .single();

    if (!coaBeban || !coaKas) {
      return NextResponse.json(
        { error: "COA tidak ditemukan" },
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

    await db
      .from("equipment_fuel")
      .update({ id_jurnal: jurnalId })
      .eq("id", fuel.id);

    return NextResponse.json({
      message: "Fuel berhasil dibuat",
      data: fuel,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
