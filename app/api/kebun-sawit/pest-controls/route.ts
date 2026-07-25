import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  PestControlSchema,
  PestControlInput,
} from "@/lib/validators/pest-controls";

import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";

interface PestControlRow {
  id: string;
  block_id: string;
  control_date: string;
  pest_type: string | null;
  severity_level: string | null;
  action_taken: string | null;
  chemical_used: string | null;
  cost: number | null;
  notes: string | null;
}

interface BlockRow {
  id: string;
  division_id: string;
  id_cost_center: string | null;
  code: string;
}

interface DivisionRow {
  id: string;
  estate_id: string;
  code: string;
}

interface EstateRow {
  id: string;
  region_id: string;
  code: string;
  name: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("pest_controls")
      .select("*")
      .order("control_date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const result: PestControlRow[] = (data ?? []).map((row) => ({
      id: row.id as string,
      block_id: row.block_id as string,
      control_date: row.control_date as string,
      pest_type: row.pest_type as string | null,
      severity_level: row.severity_level as string | null,
      action_taken: row.action_taken as string | null,
      chemical_used: row.chemical_used as string | null,
      cost: Number(row.cost ?? 0),
      notes: row.notes as string | null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json: unknown = await req.json();

    const payload: PestControlInput = PestControlSchema.parse(json);

    const insertResult = await db
      .from("pest_controls")
      .insert({
        block_id: payload.block_id,
        control_date: payload.control_date,
        pest_type: payload.pest_type,
        severity_level: payload.severity_level ?? null,
        action_taken: payload.action_taken ?? null,
        chemical_used: payload.chemical_used ?? null,
        cost: payload.cost,
        notes: payload.notes ?? null,
      })
      .select()
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error("Gagal menyimpan pest control");
    }

    const pest: PestControlRow = {
      id: insertResult.data.id as string,
      block_id: insertResult.data.block_id as string,
      control_date: insertResult.data.control_date as string,
      pest_type: insertResult.data.pest_type as string | null,
      severity_level: insertResult.data.severity_level as string | null,
      action_taken: insertResult.data.action_taken as string | null,
      chemical_used: insertResult.data.chemical_used as string | null,
      cost: Number(insertResult.data.cost ?? 0),
      notes: insertResult.data.notes as string | null,
    };

    const blockRes = await db
      .from("blocks")
      .select(
        `
  id,
  division_id,
  id_cost_center,
  code
`,
      )
      .eq("id", pest.block_id)
      .single();

    if (blockRes.error || !blockRes.data) {
      throw new Error("Block tidak ditemukan");
    }

    const block: BlockRow = {
      id: blockRes.data.id as string,
      division_id: blockRes.data.division_id as string,
      id_cost_center: blockRes.data.id_cost_center as string | null,
      code: blockRes.data.code as string,
    };

    const divisionRes = await db
      .from("divisions")
      .select(
        `
  id,
  estate_id,
  code
`,
      )
      .eq("id", block.division_id)
      .single();

    if (divisionRes.error || !divisionRes.data) {
      throw new Error("Division tidak ditemukan");
    }

    const division: DivisionRow = {
      id: divisionRes.data.id as string,
      estate_id: divisionRes.data.estate_id as string,
      code: divisionRes.data.code as string,
    };

    const estateRes = await db
      .from("estates")
      .select(
        `
  id,
  region_id,
  code,
  name
`,
      )
      .eq("id", division.estate_id)
      .single();

    if (estateRes.error || !estateRes.data) {
      throw new Error("Estate tidak ditemukan");
    }

    const estate: EstateRow = {
      id: estateRes.data.id as string,
      region_id: estateRes.data.region_id as string,
      code: estateRes.data.code as string,
      name: estateRes.data.name as string,
    };

    const regionId = estate.region_id;

    if (!regionId) {
      throw new Error("Region Estate tidak ditemukan");
    }

    const { error: regionError } = await db
      .from("regions")
      .select("id")
      .eq("id", regionId)
      .single();

    if (regionError) {
      throw new Error("Region tidak ditemukan");
    }

    const mapping = await getCoaMappingTransaction("HAMA", regionId);

    const amount = pest.cost ?? 0;

    const lines: JurnalLine[] = mapping.map((m) => ({
      id_coa: m.id_coa,
      debit: m.posisi === "DEBIT" ? amount : 0,
      kredit: m.posisi === "KREDIT" ? amount : 0,
      id_cost_center: block.id_cost_center,
    }));

    if (lines.length === 0) {
      throw new Error("Detail jurnal kosong");
    }

    await postJournal({
      tanggal: pest.control_date,
      no_bukti: `PST-${pest.id}`,
      keterangan: `Pest Control ${pest.pest_type ?? ""}`,
      sumber: "KEBUN",
      modul: "PEST_CONTROL",
      ref_id: pest.id,
      lines,
    });

    return NextResponse.json(
      {
        message: "Pest control berhasil disimpan",
        id: pest.id,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 400 });
  }
}
