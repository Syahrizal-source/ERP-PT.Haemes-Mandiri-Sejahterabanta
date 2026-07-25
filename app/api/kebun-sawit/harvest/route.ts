import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { HarvestSchema } from "@/lib/validators/harvest";
import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("harvests")
    .select("*")
    .order("harvest_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = HarvestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data harvest tidak valid" },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: block } = await db
    .from("blocks")
    .select(
      `
    id,
    division_id,
    id_cost_center,
    code
  `,
    )
    .eq("id", input.block_id)
    .single();

  if (!block) {
    return NextResponse.json(
      { message: "Block tidak ditemukan" },
      { status: 400 },
    );
  }

  const { data: division } = await db
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

  if (!division) {
    return NextResponse.json(
      { message: "Division tidak ditemukan" },
      { status: 400 },
    );
  }

  const { data: estate } = await db
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

  if (!estate) {
    return NextResponse.json(
      { message: "Estate tidak ditemukan" },
      { status: 400 },
    );
  }

  const { data: region } = await db
    .from("regions")
    .select("id, code, name")
    .eq("id", estate.region_id)
    .single();

  const regionId = estate.region_id;

  if (!regionId) {
    return NextResponse.json(
      {
        message: "Region tidak ditemukan",
      },
      {
        status: 400,
      },
    );
  }

  const tbsWeight = Number(input.total_weight_kg);

  const pricePerKg = 2500;

  const amount = tbsWeight * pricePerKg;

  const { data: harvest, error } = await db
    .from("harvests")
    .insert({
      block_id: input.block_id,
      harvest_date: input.harvest_date,
      total_bunches: input.total_bunches,
      total_weight_kg: input.total_weight_kg,
      total_loose_fruit_kg: input.total_loose_fruit_kg,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error || !harvest) {
    return NextResponse.json(
      { message: "Gagal menyimpan harvest" },
      { status: 500 },
    );
  }

  const mapping = await getCoaMappingTransaction("HARVEST", regionId);

  const lines: JurnalLine[] = mapping.map((m) => ({
    id_coa: m.id_coa,
    debit: m.posisi === "DEBIT" ? amount : 0,
    kredit: m.posisi === "KREDIT" ? amount : 0,
    id_cost_center: block.id_cost_center,
  }));

  const jurnalId = await postJournal({
    tanggal: input.harvest_date,
    no_bukti: `HV-${harvest.id}`,
    keterangan: "Produksi TBS",
    sumber: "KEBUN",
    modul: "HARVEST",
    ref_id: harvest.id,
    lines,
  });

  return NextResponse.json({
    message: "Harvest berhasil disimpan",
    jurnal_id: jurnalId,
    wilayah: {
      estate: estate.name,
      block: block.code,
      region_id: regionId,
    },
  });
}
