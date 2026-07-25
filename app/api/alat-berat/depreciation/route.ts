import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { equipmentDepreciationCreateSchema } from "@/lib/validators/alat-berat/equipment-depreciation";

import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";
import { postAlatBerat } from "@/lib/accounting/postAlatBerat";

import { JurnalLine } from "@/types/accounting";

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

  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const { data: depreciation, error } = await db
    .from("equipment_depreciation")
    .insert({
      equipment_id: input.equipment_id,
      tanggal: input.tanggal,
      nilai: nilai,
    })
    .select()
    .single();

  if (error || !depreciation) {
    return NextResponse.json(
      { message: "Gagal menyimpan depreciation" },
      { status: 500 },
    );
  }

  const coaBeban = await getCoaMappingDetail("ALAT_BERAT", "BEBAN");
  const coaKas = await getCoaMappingDetail("ALAT_BERAT", "KAS");

  const lines: JurnalLine[] = [
    {
      id_coa: coaBeban.id_coa,
      debit: nilai,
      kredit: 0,
      id_alat: depreciation.equipment_id,
      id_proyek: null,
      id_cost_center: null,
    },
    {
      id_coa: coaKas.id_coa,
      debit: 0,
      kredit: nilai,
      id_alat: depreciation.equipment_id,
      id_proyek: null,
      id_cost_center: null,
    },
  ];

  const jurnalId: number = await postAlatBerat(
    input.tanggal,
    `DEP-${depreciation.id}`,
    "Penyusutan alat berat",
    lines,
  );

  await db
    .from("equipment_depreciation")
    .update({
      id_jurnal: jurnalId,
    })
    .eq("id", depreciation.id);

  return NextResponse.json(
    {
      message: "Depreciation berhasil disimpan",
      jurnal_id: jurnalId,
    },
    { status: 201 },
  );
}
