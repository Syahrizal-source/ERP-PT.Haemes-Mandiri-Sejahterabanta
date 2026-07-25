import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/supabase/server";

import { equipmentMaintenanceCreateSchema } from "@/lib/validators/alat-berat/equipment-maintenance";

import { getCoaMappingDetail } from "@/lib/accounting/getcoamapping";
import { postAlatBerat } from "@/lib/accounting/postAlatBerat";

import { JurnalLine } from "@/types/accounting";

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

  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const { data: maintenance, error } = await db
    .from("equipment_maintenance")
    .insert({
      equipment_id: input.equipment_id,
      tanggal: input.tanggal,
      jenis: input.jenis ?? null,
      vendor_id: input.vendor_id ?? null,
      hm_service: input.hm_service ?? null,
      biaya: biaya,
      keterangan: input.keterangan ?? null,
    })
    .select()
    .single();

  if (error || !maintenance) {
    return NextResponse.json(
      { message: "Gagal menyimpan maintenance" },
      { status: 500 },
    );
  }

  const coaKas = await getCoaMappingDetail("ALAT_BERAT", "KAS");
  const coaBeban = await getCoaMappingDetail("ALAT_BERAT", "BEBAN");

  const lines: JurnalLine[] = [
    {
      id_coa: coaBeban.id_coa,
      debit: biaya,
      kredit: 0,
      id_alat: maintenance.equipment_id,
      id_proyek: null,
      id_cost_center: null,
    },
    {
      id_coa: coaKas.id_coa,
      debit: 0,
      kredit: biaya,
      id_alat: maintenance.equipment_id,
      id_proyek: null,
      id_cost_center: null,
    },
  ];

  const jurnalId: number = await postAlatBerat(
    input.tanggal,
    `MTC-${maintenance.id}`,
    "Biaya maintenance alat berat",
    lines,
  );

  await db
    .from("equipment_maintenance")
    .update({
      id_jurnal: jurnalId,
    })
    .eq("id", maintenance.id);

  return NextResponse.json(
    {
      message: "Maintenance berhasil disimpan",
      jurnal_id: jurnalId,
    },
    { status: 201 },
  );
}
