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

  control_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  pest_type: z.string().max(100).optional(),

  severity_level: z.enum(["RENDAH", "SEDANG", "TINGGI"]).optional(),

  action_taken: z.string().max(100).optional(),

  chemical_used: z.string().max(100).optional(),

  cost: z.coerce.number().min(0, "Biaya tidak boleh minus").optional(),

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
    .from("pest_controls")
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

    const baseCost: number = input.cost ?? 0;
    const ppnRate: number = input.ppn_rate ?? 0;
    const pphRate: number = input.pph23_rate ?? 0;

    const ppnAmount: number = (baseCost * ppnRate) / 100;
    const pphAmount: number = (baseCost * pphRate) / 100;

    if (ppnAmount < 0 || pphAmount < 0) {
      return NextResponse.json(
        { message: "Perhitungan pajak tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("pest_controls")
      .update({
        block_id: input.block_id,
        control_date: input.control_date,
        pest_type: input.pest_type,
        severity_level: input.severity_level,
        action_taken: input.action_taken,
        chemical_used: input.chemical_used,
        cost: baseCost,
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    /* =========================
       INSERT PPN (Optional)
    ========================= */

    if (ppnRate > 0) {
      await db.from("ppn").insert({
        id_transaksi: id,
        jenis_ppn: "masukan",
        nilai_dasar: baseCost,
        tarif_ppn: ppnRate,
        nilai_ppn: ppnAmount,
        tanggal_transaksi: input.control_date ?? new Date().toISOString(),
      });
    }

    /* =========================
       INSERT PPh23 (Optional)
    ========================= */

    if (pphRate > 0) {
      await db.from("pph23").insert({
        id_vendor: 1,
        jenis_jasa: "Jasa Pengendalian Hama",
        nilai_transaksi: baseCost,
        tarif_pph23: pphRate,
        pph23_terutang: pphAmount,
        tanggal_transaksi: input.control_date ?? new Date().toISOString(),
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

  const { error } = await db.from("pest_controls").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Pest control berhasil dihapus" },
    { status: 200 },
  );
}
