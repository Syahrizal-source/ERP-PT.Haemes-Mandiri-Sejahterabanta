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
  block_id: z.string().uuid("Block ID tidak valid").optional(),

  item_id: z.string().uuid("Item ID tidak valid").optional(),

  vendor_name: z.string().max(100).optional(),

  fertilization_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  dose_per_ha: z.coerce.number().min(0, "Dosis tidak boleh minus").optional(),

  total_used: z.coerce
    .number()
    .min(0, "Total pemakaian tidak boleh minus")
    .optional(),

  labor_cost: z.coerce
    .number()
    .min(0, "Biaya tenaga kerja tidak boleh minus")
    .optional(),

  ppn_rate: z.coerce.number().min(0).max(100).optional(),

  pph23_rate: z.coerce.number().min(0).max(100).optional(),

  notes: z.string().max(500).optional(),
});

type UpdateInput = z.infer<typeof updateSchema>;

/* =========================
   GET BY ID
========================= */

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const params = await context.params;

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id: string = parsed.data.id;

  const { data, error } = await db
    .from("fertilizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}

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
       HITUNG BIAYA DASAR
    ========================= */

    const baseCost: number = input.labor_cost ?? 0;

    if (baseCost < 0) {
      return NextResponse.json(
        { message: "Perhitungan biaya tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("fertilizations")
      .update({
        block_id: input.block_id,
        item_id: input.item_id ?? null,
        vendor_name: input.vendor_name ?? null,
        fertilization_date: input.fertilization_date,
        dose_per_ha: input.dose_per_ha,
        total_used: input.total_used,
        labor_cost: input.labor_cost,
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    /* =========================
       HANDLE PPN
    ========================= */

    if (input.ppn_rate !== undefined && input.ppn_rate > 0) {
      const ppnAmount: number = (baseCost * input.ppn_rate) / 100;

      await db.from("ppn").insert({
        id_transaksi: id,
        jenis_ppn: "masukan",
        nilai_dasar: baseCost,
        tarif_ppn: input.ppn_rate,
        nilai_ppn: ppnAmount,
        tanggal_transaksi: input.fertilization_date ?? new Date().toISOString(),
      });
    }

    /* =========================
       HANDLE PPh23
    ========================= */

    if (input.pph23_rate !== undefined && input.pph23_rate > 0) {
      const pphAmount: number = (baseCost * input.pph23_rate) / 100;

      await db.from("pph23").insert({
        id_vendor: 1,
        jenis_jasa: "Jasa Pemupukan",
        nilai_transaksi: baseCost,
        tarif_pph23: input.pph23_rate,
        pph23_terutang: pphAmount,
        tanggal_transaksi: input.fertilization_date ?? new Date().toISOString(),
      });
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

  const parsed = paramSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id: string = parsed.data.id;

  const { error } = await db.from("fertilizations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Fertilization berhasil dihapus" },
    { status: 200 },
  );
}
