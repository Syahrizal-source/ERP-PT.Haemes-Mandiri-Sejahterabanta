import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { equipmentMaintenanceCreateSchema } from "@/lib/validators/alat-berat/equipment-maintenance";

import { postAlatBerat } from "@/lib/accounting/postAlatBerat";

import type { JurnalLine } from "@/types/accounting";

interface EquipmentMaintenance {
  id: string;
  equipment_id: string;
  tanggal: string;
  jenis: string | null;
  vendor_id: number | null;
  hm_service: number | null;
  biaya: number | null;
  id_jurnal: number | null;
  keterangan: string | null;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("equipment_maintenance")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows: EquipmentMaintenance[] = data ?? [];

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = equipmentMaintenanceCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data maintenance tidak valid" },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const biaya: number = Number(input.biaya ?? 0);

    if (!Number.isFinite(biaya) || biaya <= 0) {
      return NextResponse.json(
        { message: "Biaya maintenance harus lebih dari 0." },
        { status: 400 },
      );
    }

    const { data: maintenance, error } = await db
      .from("equipment_maintenance")
      .insert({
        equipment_id: input.equipment_id,
        tanggal: input.tanggal,
        jenis: input.jenis ?? null,
        vendor_id: input.vendor_id ?? null,
        hm_service: input.hm_service ?? null,
        biaya,
        keterangan: input.keterangan ?? null,
      })
      .select()
      .single();

    if (error || !maintenance) {
      return NextResponse.json(
        {
          message: error?.message ?? "Gagal menyimpan maintenance",
        },
        { status: 500 },
      );
    }

    const maintenanceRow: EquipmentMaintenance = maintenance;

    /*
     * COA Maintenance Alat Berat
     *
     * Maintenance biasa / sparepart:
     *   DEBIT  51004 - Biaya Sparepart Alat Berat
     *
     * Overhaul:
     *   DEBIT  51006 - Biaya Overhaul
     *
     * Kas:
     *   KREDIT 11120 - Kas Alat Berat
     *
     * Semua COA diambil langsung berdasarkan kode
     * dan WAJIB aktif serta bukan header.
     */

    const jenisMaintenance: string = (input.jenis ?? "").trim().toLowerCase();

    const isOverhaul: boolean = jenisMaintenance.includes("overhaul");

    const kodeBeban: string = isOverhaul ? "51006" : "51004";

    const { data: coaBeban, error: coaBebanError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", kodeBeban)
      .eq("aktif", true)
      .eq("is_header", false)
      .single();

    if (coaBebanError || !coaBeban) {
      return NextResponse.json(
        {
          message:
            coaBebanError?.message ??
            `COA ${kodeBeban} tidak ditemukan atau tidak aktif.`,
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
          message:
            coaKasError?.message ??
            "COA 11120 - Kas Alat Berat tidak ditemukan atau tidak aktif.",
        },
        { status: 400 },
      );
    }

    const lines: JurnalLine[] = [
      {
        id_coa: coaBeban.id_coa,
        debit: biaya,
        kredit: 0,
        id_alat: maintenanceRow.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
      {
        id_coa: coaKas.id_coa,
        debit: 0,
        kredit: biaya,
        id_alat: maintenanceRow.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
    ];

    const jurnalId: number = await postAlatBerat(
      input.tanggal,
      `MTC-${maintenanceRow.id}`,
      "Biaya maintenance alat berat",
      lines,
    );

    const { error: updateError } = await db
      .from("equipment_maintenance")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", maintenanceRow.id);

    if (updateError) {
      return NextResponse.json(
        {
          message: updateError.message,
          jurnal_id: jurnalId,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Maintenance berhasil disimpan",
        jurnal_id: jurnalId,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan maintenance alat berat.",
      },
      { status: 500 },
    );
  }
}
