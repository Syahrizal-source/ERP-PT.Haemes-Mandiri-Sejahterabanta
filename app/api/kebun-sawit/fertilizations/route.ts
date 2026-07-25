import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { fertilizationSchema } from "@/lib/validators/fertilizations";
import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("fertilizations")
    .select("*")
    .order("fertilization_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();

  const parsed = fertilizationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data fertilization tidak valid" },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: block } = await db
    .from("blocks")
    .select(
      `
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

  const { data: fertilization, error } = await db
    .from("fertilizations")
    .insert({
      block_id: input.block_id,
      item_id: input.item_id ?? null,
      vendor_name: input.vendor_name ?? null,
      fertilization_date: input.fertilization_date,
      dose_per_ha: input.dose_per_ha ?? null,
      total_used: input.total_used ?? null,
      labor_cost: input.labor_cost,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error || !fertilization) {
    return NextResponse.json(
      { message: "Gagal menyimpan fertilization" },
      { status: 500 },
    );
  }

  const amount = Number(input.labor_cost);

  const mapping = await getCoaMappingTransaction("PEMUPUKAN", regionId);

  const lines: JurnalLine[] = mapping.map((m) => ({
    id_coa: m.id_coa,
    debit: m.posisi === "DEBIT" ? amount : 0,
    kredit: m.posisi === "KREDIT" ? amount : 0,
    id_cost_center: block.id_cost_center,
  }));

  const jurnalId = await postJournal({
    tanggal: input.fertilization_date,
    no_bukti: `FRT-${fertilization.id}`,
    keterangan: "Biaya pemupukan kebun",
    sumber: "KEBUN",
    modul: "FERTILIZATION",
    ref_id: fertilization.id,
    lines,
  });

  return NextResponse.json({
    message: "Fertilization berhasil disimpan",
    jurnal_id: jurnalId,
    wilayah: {
      estate: estate.name,
      block: block.code,
      region_id: regionId,
    },
  });
}
