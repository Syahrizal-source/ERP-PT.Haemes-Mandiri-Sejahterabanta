import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
import { z } from "zod";

import {
  workPremiumUpdateSchema,
  WorkPremiumUpdateInput,
} from "@/lib/validators/work-premiums";

/* =========================
   PARAM VALIDATION
========================= */

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

function getZodErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => issue.message);
}

/* =========================
   GET DETAIL
========================= */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { errors: getZodErrors(parsedParams.error) },
      { status: 400 },
    );
  }

  const id: string = parsedParams.data.id;

  const { data, error } = await db
    .from("work_premiums")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   UPDATE
========================= */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { errors: getZodErrors(parsedParams.error) },
        { status: 400 },
      );
    }

    const id: string = parsedParams.data.id;

    const body: unknown = await req.json();

    const parsedBody = workPremiumUpdateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: getZodErrors(parsedBody.error) },
        { status: 400 },
      );
    }

    const payload: WorkPremiumUpdateInput = parsedBody.data;

    let totalPremium: number | undefined;
    let pph21Amount: number | undefined;
    let totalAfterTax: number | undefined;

    if (payload.work_result !== undefined && payload.rate !== undefined) {
      totalPremium = payload.work_result * payload.rate;

      if (payload.pph21_rate !== undefined) {
        pph21Amount = (totalPremium * payload.pph21_rate) / 100;
        totalAfterTax = totalPremium - pph21Amount;
      }
    }

    const updateData: {
      employee_id?: string;
      block_id?: string | null;
      work_date?: string;
      work_type?: string;
      work_result?: number;
      rate?: number;
      pph21_rate?: number;
      pph21_amount?: number;
      total_after_tax?: number;
    } = {
      ...payload,
    };

    if (pph21Amount !== undefined) {
      updateData.pph21_amount = pph21Amount;
    }

    if (totalAfterTax !== undefined) {
      updateData.total_after_tax = totalAfterTax;
    }

    const { error } = await db
      .from("work_premiums")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Work premium berhasil diupdate" },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";

    return NextResponse.json({ message }, { status: 500 });
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { errors: getZodErrors(parsedParams.error) },
      { status: 400 },
    );
  }

  const id: string = parsedParams.data.id;

  const { error } = await db.from("work_premiums").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Work premium berhasil dihapus" },
    { status: 200 },
  );
}
