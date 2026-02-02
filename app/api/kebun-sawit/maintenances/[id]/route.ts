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

  maintenance_date: z
    .string()
    .refine((val: string) => !isNaN(Date.parse(val)), {
      message: "Tanggal tidak valid",
    })
    .optional(),

  activity_type: z
    .enum(["SEMPROT_GULMA", "TEBAS", "PRUNING", "DONGKEL_ANAK_KAYU", "LAINNYA"])
    .optional(),

  area_ha: z.coerce.number().min(0, "Luas tidak boleh minus").optional(),

  labor_cost: z.coerce
    .number()
    .min(0, "Biaya tenaga kerja tidak boleh minus")
    .optional(),

  vendor_cost: z.coerce
    .number()
    .min(0, "Biaya vendor tidak boleh minus")
    .optional(),

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
    .from("maintenances")
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

    const laborCost: number = input.labor_cost ?? 0;
    const vendorCost: number = input.vendor_cost ?? 0;
    const pphRate: number = input.pph23_rate ?? 0;

    const pphAmount: number = (vendorCost * pphRate) / 100;
    const totalCost: number = laborCost + vendorCost - pphAmount;

    if (pphAmount < 0 || totalCost < 0) {
      return NextResponse.json(
        { message: "Perhitungan biaya tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("maintenances")
      .update({
        block_id: input.block_id,
        maintenance_date: input.maintenance_date,
        activity_type: input.activity_type,
        area_ha: input.area_ha,
        labor_cost: input.labor_cost,
        vendor_cost: vendorCost,
        pph23_rate: pphRate,
        pph23_amount: pphAmount,
        total_cost: totalCost,
        notes: input.notes ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    /* =========================
       INSERT PPh23 RECORD
    ========================= */

    if (pphRate > 0) {
      await db.from("pph23").insert({
        id_vendor: 1,
        jenis_jasa: "Jasa Maintenance Kebun",
        nilai_transaksi: vendorCost,
        tarif_pph23: pphRate,
        pph23_terutang: pphAmount,
        tanggal_transaksi: input.maintenance_date ?? new Date().toISOString(),
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

  const { error } = await db.from("maintenances").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Maintenance berhasil dihapus" },
    { status: 200 },
  );
}
