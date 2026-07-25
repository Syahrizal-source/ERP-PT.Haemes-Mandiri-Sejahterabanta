import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  replantingCreateSchema,
  ReplantingCreateInput,
} from "@/lib/validators/replantings";

import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";

/* =========================
   GET REPLANTING
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("replantings")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   CREATE REPLANTING
========================= */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    const parsed = replantingCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const input: ReplantingCreateInput = parsed.data;

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

    const { data: costCenter } = await db
      .from("cost_centers")
      .select("id_cost_center")
      .eq("region_id", estate.region_id)
      .limit(1)
      .single();

    if (!costCenter) {
      return NextResponse.json(
        { message: "Cost center tidak ditemukan" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("replantings")
      .insert({
        block_id: input.block_id,
        tanggal: input.tanggal,
        pokok_ditebang: input.pokok_ditebang,
        pokok_ditanam: input.pokok_ditanam,
        biaya_total: input.biaya_total,
        keterangan: input.keterangan ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    /* =========================
       POSTING JURNAL
    ========================= */

    const mapping = await getCoaMappingTransaction(
      "REPLANTING",
      estate.region_id,
    );

    const amount = Number(input.biaya_total);

    if (amount <= 0) {
      throw new Error("Biaya replanting harus lebih besar dari 0");
    }

    const lines: JurnalLine[] = mapping.map((m) => ({
      id_coa: m.id_coa,
      debit: m.posisi === "DEBIT" ? input.biaya_total : 0,
      kredit: m.posisi === "KREDIT" ? input.biaya_total : 0,
      id_cost_center: block.id_cost_center,
    }));

    await postJournal({
      tanggal: input.tanggal,
      no_bukti: `RPL-${data.id}`,
      keterangan: "Biaya Replanting Kebun",
      sumber: "KEBUN",
      modul: "REPLANTING",
      ref_id: data.id,
      lines,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
