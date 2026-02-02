import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   ZOD SCHEMA
========================= */

const workPremiumSchema = z.object({
  employee_id: z.string().uuid("Employee ID tidak valid"),
  block_id: z.string().uuid("Block ID tidak valid").nullable().optional(),
  work_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Tanggal kerja tidak valid",
  }),
  work_type: z.string().min(1).max(50),
  work_result: z.coerce.number().min(0, "Hasil kerja tidak boleh minus"),
  rate: z.coerce.number().min(0, "Tarif tidak boleh minus"),
  pph21_rate: z.coerce
    .number()
    .min(0, "Tarif PPh21 tidak boleh minus")
    .max(100, "Tarif PPh21 maksimal 100%")
    .optional(),
});

type WorkPremiumInput = z.infer<typeof workPremiumSchema>;

/* =========================
   GET ALL WORK PREMIUMS
========================= */

export async function GET(): Promise<NextResponse> {
  const { data, error } = await db
    .from("work_premiums")
    .select("*")
    .order("work_date", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

/* =========================
   POST CREATE WORK PREMIUM
========================= */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const parsed = workPremiumSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input: WorkPremiumInput = parsed.data;

    const totalPremium: number = input.work_result * input.rate;

    const pphRate: number = input.pph21_rate ?? 0;
    const pphAmount: number = (totalPremium * pphRate) / 100;

    if (pphAmount < 0) {
      return NextResponse.json(
        { message: "Perhitungan pajak tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("work_premiums")
      .insert({
        employee_id: input.employee_id,
        block_id: input.block_id ?? null,
        work_date: input.work_date,
        work_type: input.work_type,
        work_result: input.work_result,
        rate: input.rate,
        pph21_rate: pphRate,
        pph21_amount: pphAmount,
        total_after_tax: totalPremium - pphAmount,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}
