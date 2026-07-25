import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";

import {
  workPremiumSchema,
  WorkPremiumInput,
} from "@/lib/validators/work-premiums";
import { postJournal } from "@/lib/accounting/postJournal";
import { JurnalLine } from "@/types/accounting";
import { getCoaMappingTransaction } from "@/lib/accounting/getcoamappingtransaction";

/* ================================
   TYPE DEFINITIONS
================================ */

interface WorkPremiumRow {
  id: string;
  employee_id: string;
  block_id: string | null;
  work_date: string;
  work_type: string;
  work_result: number;
  rate: number;
  total_premium: number;
  pph21_rate: number;
  pph21_amount: number;
  total_after_tax: number;
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

/* ================================
   GET WORK PREMIUM
================================ */

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await db
      .from("work_premiums")
      .select("*")
      .order("work_date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const result: WorkPremiumRow[] = (data ?? []).map((row) => ({
      id: row.id as string,
      employee_id: row.employee_id as string,
      block_id: row.block_id as string | null,
      work_date: row.work_date as string,
      work_type: row.work_type as string,
      work_result: Number(row.work_result),
      rate: Number(row.rate),
      total_premium: Number(row.total_premium),
      pph21_rate: Number(row.pph21_rate),
      pph21_amount: Number(row.pph21_amount),
      total_after_tax: Number(row.total_after_tax),
    }));

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 500 });
  }
}

/* ================================
   POST WORK PREMIUM
================================ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json: unknown = await req.json();

    const payload: WorkPremiumInput = workPremiumSchema.parse(json);

    const totalPremium = Number(payload.work_result) * Number(payload.rate);

    const pph21Amount = totalPremium * (Number(payload.pph21_rate) / 100);

    const totalAfterTax = totalPremium - pph21Amount;

    /* ======================
       INSERT DATABASE
    ====================== */

    const insertResult = await db
      .from("work_premiums")
      .insert({
        employee_id: payload.employee_id,
        block_id: payload.block_id ?? null,
        work_date: payload.work_date,
        work_type: payload.work_type,
        work_result: payload.work_result,
        rate: payload.rate,
        // JANGAN kirim total_premium
        pph21_rate: payload.pph21_rate,
        pph21_amount: pph21Amount,
        total_after_tax: totalAfterTax,
      })
      .select()
      .single();

    if (insertResult.error) {
      console.error(insertResult.error);
      throw new Error(insertResult.error.message);
    }

    const premium: WorkPremiumRow = {
      id: insertResult.data.id as string,
      employee_id: insertResult.data.employee_id as string,
      block_id: insertResult.data.block_id as string | null,
      work_date: insertResult.data.work_date as string,
      work_type: insertResult.data.work_type as string,
      work_result: Number(insertResult.data.work_result),
      rate: Number(insertResult.data.rate),
      total_premium: Number(insertResult.data.total_premium),
      pph21_rate: Number(insertResult.data.pph21_rate),
      pph21_amount: Number(insertResult.data.pph21_amount),
      total_after_tax: Number(insertResult.data.total_after_tax),
    };

    /* ======================
       POST JURNAL
    ====================== */

    try {
      if (premium.block_id) {
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
          .eq("id", premium.block_id)
          .single();

        if (blockRes.error || !blockRes.data)
          throw new Error("Block tidak ditemukan");
        {
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

          if (divisionRes.error || !divisionRes.data)
            throw new Error("Division tidak ditemukan");
          {
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

            if (estateRes.error || !estateRes.data)
              throw new Error("Estate tidak ditemukan");
            {
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

              const mapping = await getCoaMappingTransaction("GAJI", regionId);

              const debit = mapping.find((m) => m.posisi === "DEBIT");

              const kredit = mapping.find((m) => m.posisi === "KREDIT");

              if (!debit || !kredit) {
                throw new Error(
                  `Mapping GAJI Region ${regionId} belum lengkap`,
                );
              }

              const amount = premium.total_premium;

              const lines: JurnalLine[] = mapping.map((m) => ({
                id_coa: m.id_coa,
                debit: m.posisi === "DEBIT" ? amount : 0,
                kredit: m.posisi === "KREDIT" ? amount : 0,
                id_cost_center: block.id_cost_center ?? null,
              }));

              await postJournal({
                tanggal: premium.work_date,
                no_bukti: `WP-${premium.id}`,
                keterangan: `Work Premium ${premium.work_type}`,
                sumber: "KEBUN",
                modul: "WORK_PREMIUM",
                ref_id: premium.id,
                lines,
              });
            }
          }
        }
      }
    } catch (journalError) {
      console.error("WORK PREMIUM JOURNAL ERROR:", journalError);
    }

    return NextResponse.json(
      {
        message: "Work premium berhasil disimpan",
        id: premium.id,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 400 });
  }
}
