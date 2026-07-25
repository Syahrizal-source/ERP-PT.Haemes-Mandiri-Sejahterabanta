import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { postJournal } from "@/lib/accounting/postJournal";
import type { JurnalLine } from "@/types/accounting";

type RentalInput = {
  equipment_id: string;
  tanggal: string;
  id_proyek: string | null;
  customer: string;
  jam: number;
  harga_jam: number;
};

type RentalRow = {
  id: string;
  equipment_id: string;
  tanggal: string;
  id_proyek: string | null;
  customer: string;
  jam: number;
  harga_jam: number;
  subtotal: number;
  ppn: number;
  pph23: number;
  total: number;
  id_jurnal: number | null;
};

export async function GET() {
  const { data, error } = await db
    .from("equipment_rental")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: RentalRow[] = data ?? [];

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body: RentalInput = await req.json();

    const subtotal: number = body.jam * body.harga_jam;
    const ppn: number = subtotal * 0.11;
    const pph23: number = subtotal * 0.02;
    const total: number = subtotal + ppn - pph23;

    const { data: rentalInsert, error: rentalError } = await db
      .from("equipment_rental")
      .insert({
        equipment_id: body.equipment_id,
        tanggal: body.tanggal,
        id_proyek: body.id_proyek,
        customer: body.customer,
        jam: body.jam,
        harga_jam: body.harga_jam,
        subtotal,
        ppn,
        pph23,
        total,
      })
      .select()
      .single();

    if (rentalError || !rentalInsert) {
      return NextResponse.json(
        { error: rentalError?.message },
        { status: 500 },
      );
    }

    const rental: RentalRow = rentalInsert;

    const { data: coaKas } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "11020")
      .single();

    const { data: coaPendapatan } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "41102")
      .single();

    const { data: coaPPN } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22001")
      .single();

    const { data: coaPPh23 } = await db
      .from("coa")
      .select("id_coa")
      .eq("kode", "22003")
      .single();

    if (!coaKas || !coaPendapatan || !coaPPN || !coaPPh23) {
      return NextResponse.json(
        { error: "COA tidak ditemukan" },
        { status: 400 },
      );
    }

    const lines: JurnalLine[] = [
      {
        id_coa: coaKas.id_coa,
        debit: total,
        kredit: 0,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
      {
        id_coa: coaPPh23.id_coa,
        debit: pph23,
        kredit: 0,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
      {
        id_coa: coaPendapatan.id_coa,
        debit: 0,
        kredit: subtotal,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
      {
        id_coa: coaPPN.id_coa,
        debit: 0,
        kredit: ppn,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
    ];

    const jurnalId: number = await postJournal({
      tanggal: body.tanggal,
      no_bukti: `RENT-${rental.id}`,
      keterangan: "Rental Alat Berat",
      sumber: "ALAT_BERAT",
      modul: "ALAT_BERAT",
      ref_id: rental.id,
      id_proyek: body.id_proyek,
      lines,
    });

    await db
      .from("equipment_rental")
      .update({ id_jurnal: jurnalId })
      .eq("id", rental.id);

    return NextResponse.json({
      message: "Rental berhasil dibuat",
      data: rental,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
