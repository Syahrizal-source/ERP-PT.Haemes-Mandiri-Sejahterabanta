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

    if (!body.equipment_id) {
      return NextResponse.json(
        { error: "Equipment wajib dipilih." },
        { status: 400 },
      );
    }

    if (!body.tanggal) {
      return NextResponse.json(
        { error: "Tanggal rental wajib diisi." },
        { status: 400 },
      );
    }

    if (!body.customer.trim()) {
      return NextResponse.json(
        { error: "Customer wajib diisi." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(body.jam) || body.jam <= 0) {
      return NextResponse.json(
        { error: "Jumlah jam harus lebih dari 0." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(body.harga_jam) || body.harga_jam <= 0) {
      return NextResponse.json(
        { error: "Harga per jam harus lebih dari 0." },
        { status: 400 },
      );
    }

    const subtotal: number = body.jam * body.harga_jam;

    /*
     * Rental Alat Berat ini tidak menggunakan pajak.
     *
     * Struktur tabel equipment_rental tetap dipertahankan,
     * tetapi PPN dan PPh23 bernilai 0.
     */
    const ppn: number = 0;
    const pph23: number = 0;
    const total: number = subtotal;

    const { data: rentalInsert, error: rentalError } = await db
      .from("equipment_rental")
      .insert({
        equipment_id: body.equipment_id,
        tanggal: body.tanggal,
        id_proyek: body.id_proyek,
        customer: body.customer.trim(),
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
        {
          error:
            rentalError?.message ?? "Gagal menyimpan data rental alat berat.",
        },
        { status: 500 },
      );
    }

    const rental: RentalRow = rentalInsert;

    /*
     * COA Rental Alat Berat:
     *
     * DEBIT  : 51007 - Biaya Rental Alat
     * KREDIT : 11120 - Kas Alat Berat
     *
     * Tidak menggunakan:
     * - 41102 Pendapatan Alat Berat (inactive)
     * - 41001 Pendapatan Sewa Alat Berat (inactive)
     * - PPN
     * - PPh23
     */

    const { data: coaBeban, error: coaBebanError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", "51007")
      .eq("aktif", true)
      .eq("is_header", false)
      .single();

    if (coaBebanError || !coaBeban) {
      return NextResponse.json(
        {
          error:
            coaBebanError?.message ??
            "COA 51007 - Biaya Rental Alat tidak ditemukan atau tidak aktif.",
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
        debit: subtotal,
        kredit: 0,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: subtotal,
        id_alat: body.equipment_id,
        id_proyek: body.id_proyek,
        id_cost_center: null,
      },
    ];

    const jurnalId: number = await postJournal({
      tanggal: body.tanggal,
      no_bukti: `RENT-${rental.id}`,
      keterangan: `Biaya Rental Alat Berat - ${body.customer.trim()}`,
      sumber: "ALAT_BERAT",
      modul: "ALAT_BERAT",
      ref_id: rental.id,
      id_proyek: body.id_proyek,
      lines,
    });

    const { error: updateError } = await db
      .from("equipment_rental")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", rental.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
          data: rental,
          jurnal_id: jurnalId,
        },
        { status: 500 },
      );
    }

    const finalRental: RentalRow = {
      ...rental,
      id_jurnal: jurnalId,
    };

    return NextResponse.json({
      message: "Rental alat berat berhasil dibuat",
      data: finalRental,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses rental alat berat.",
      },
      { status: 500 },
    );
  }
}
