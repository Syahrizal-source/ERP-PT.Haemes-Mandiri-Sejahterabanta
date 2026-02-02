import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/server";

/* =========================
   PARAM VALIDATION
========================= */

const paramSchema = z.object({
  id: z.string().uuid("ID tidak valid"),
});

/* =========================
   UPDATE SCHEMA
========================= */

const updateSchema = z.object({
  employee_id: z.string().uuid("Employee ID tidak valid").optional(),

  block_id: z.string().uuid("Block ID tidak valid").optional(),

  work_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  work_type: z.string().min(1).max(50).optional(),

  work_result: z.coerce
    .number()
    .min(0, "Hasil kerja tidak boleh minus")
    .optional(),

  rate: z.coerce.number().min(0, "Tarif tidak boleh minus").optional(),

  pph21_rate: z.coerce
    .number()
    .min(0, "Tarif PPh21 tidak boleh minus")
    .max(100, "Tarif PPh21 maksimal 100%")
    .optional(),
});

type UpdateInput = z.infer<typeof updateSchema>;

/* =========================
   PUT (UPDATE)
========================= */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const params = await context.params;

    const parsedParams = paramSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { errors: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const id: string = parsedParams.data.id;

    const body: unknown = await request.json();
    const parsedBody = updateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { errors: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const input: UpdateInput = parsedBody.data;

    /* =========================
       HITUNG ULANG PREMI
    ========================= */

    const workResult: number = input.work_result ?? 0;
    const rate: number = input.rate ?? 0;
    const totalPremium: number = workResult * rate;

    if (totalPremium < 0) {
      return NextResponse.json(
        { message: "Perhitungan premi tidak valid" },
        { status: 400 },
      );
    }

    const pphRate: number = input.pph21_rate ?? 0;
    const pphAmount: number = (totalPremium * pphRate) / 100;

    if (pphAmount < 0) {
      return NextResponse.json(
        { message: "Perhitungan PPh21 tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("work_premiums")
      .update({
        employee_id: input.employee_id,
        block_id: input.block_id ?? null,
        work_date: input.work_date,
        work_type: input.work_type,
        work_result: input.work_result,
        rate: input.rate,
        pph21_rate: pphRate,
        pph21_amount: pphAmount,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;

  const parsedParams = paramSchema.safeParse(params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { errors: parsedParams.error.flatten() },
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
