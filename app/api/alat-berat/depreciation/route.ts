import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { equipmentDepreciationCreateSchema } from "@/lib/validators/alat-berat/equipment-depreciation";

import { postAlatBerat } from "@/lib/accounting/postAlatBerat";

import type { JurnalLine } from "@/types/accounting";

interface EquipmentDepreciation {
  id: string;
  equipment_id: string;
  tanggal: string;
  nilai: number;
  id_jurnal: number | null;
}

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("equipment_depreciation")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rows: EquipmentDepreciation[] = data ?? [];

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = equipmentDepreciationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Data depreciation tidak valid" },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const nilai: number = Number(input.nilai);

    if (!Number.isFinite(nilai) || nilai <= 0) {
      return NextResponse.json(
        { message: "Nilai depreciation harus lebih dari 0." },
        { status: 400 },
      );
    }

    /*
     * COA Depreciation Alat Berat
     *
     * DEBIT  : 61102 - Beban Alat Berat
     * KREDIT : 12201 - Akumulasi Penyusutan Alat Berat
     *
     * Tidak menggunakan:
     * - 11120 Kas Alat Berat
     * - 12141 Alat Berat sebagai kredit
     *
     * Penyusutan dicatat sebagai beban dan akumulasi
     * penyusutan, bukan sebagai transaksi kas.
     */

    const { data: coaBeban, error: coaBebanError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", "61102")
      .eq("aktif", true)
      .eq("is_header", false)
      .single();

    if (coaBebanError || !coaBeban) {
      return NextResponse.json(
        {
          message:
            coaBebanError?.message ??
            "COA 61102 - Beban Alat Berat tidak ditemukan atau tidak aktif.",
        },
        { status: 400 },
      );
    }

    const { data: coaAkumulasi, error: coaAkumulasiError } = await db
      .from("coa")
      .select("id_coa, kode, nama, aktif, is_cash, is_header")
      .eq("kode", "12201")
      .eq("aktif", true)
      .eq("is_header", false)
      .single();

    if (coaAkumulasiError || !coaAkumulasi) {
      return NextResponse.json(
        {
          message:
            coaAkumulasiError?.message ??
            "COA 12201 - Akumulasi Penyusutan Alat Berat tidak ditemukan atau tidak aktif.",
        },
        { status: 400 },
      );
    }

    const { data: depreciation, error } = await db
      .from("equipment_depreciation")
      .insert({
        equipment_id: input.equipment_id,
        tanggal: input.tanggal,
        nilai,
      })
      .select()
      .single();

    if (error || !depreciation) {
      return NextResponse.json(
        {
          message: error?.message ?? "Gagal menyimpan depreciation",
        },
        { status: 500 },
      );
    }

    const depreciationRow: EquipmentDepreciation = depreciation;

    const lines: JurnalLine[] = [
      {
        id_coa: coaBeban.id_coa,
        debit: nilai,
        kredit: 0,
        id_alat: depreciationRow.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
      {
        id_coa: coaAkumulasi.id_coa,
        debit: 0,
        kredit: nilai,
        id_alat: depreciationRow.equipment_id,
        id_proyek: null,
        id_cost_center: null,
      },
    ];

    const jurnalId: number = await postAlatBerat(
      input.tanggal,
      `DEP-${depreciationRow.id}`,
      "Penyusutan alat berat",
      lines,
    );

    const { error: updateError } = await db
      .from("equipment_depreciation")
      .update({
        id_jurnal: jurnalId,
      })
      .eq("id", depreciationRow.id);

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
        message: "Depreciation berhasil disimpan",
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
            : "Terjadi kesalahan saat menyimpan depreciation alat berat.",
      },
      { status: 500 },
    );
  }
}
